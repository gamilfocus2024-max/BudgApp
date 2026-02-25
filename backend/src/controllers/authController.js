const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { getDb } = require('../config/database');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const formatUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    currency: user.currency,
    locale: user.locale,
    theme: user.theme,
    role: user.role,
    createdAt: user.created_at
});

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Données invalides', details: errors.array() });
        }

        const { name, email, password, currency = 'EUR' } = req.body;
        const db = getDb();

        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        db.prepare(`
      INSERT INTO users (id, name, email, password, currency)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name.trim(), email.toLowerCase().trim(), hashedPassword, currency);

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        const token = generateToken(userId);

        // Notif de bienvenue
        db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 'Bienvenue sur BudgApp ! 🎉', 'Votre compte a été créé avec succès. Commencez à gérer vos finances dès maintenant.', 'success');

        res.status(201).json({
            message: 'Compte créé avec succès',
            token,
            user: formatUser(user)
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Données invalides', details: errors.array() });
        }

        const { email, password } = req.body;
        const db = getDb();

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Votre compte a été désactivé. Contactez le support.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const token = generateToken(user.id);

        res.json({
            message: 'Connexion réussie',
            token,
            user: formatUser(user)
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
const getMe = (req, res) => {
    res.json({ user: formatUser(req.user) });
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
    try {
        const { name, currency, locale, theme } = req.body;
        const db = getDb();

        db.prepare(`
      UPDATE users SET name = ?, currency = ?, locale = ?, theme = ?, updated_at = unixepoch()
      WHERE id = ?
    `).run(name || req.user.name, currency || req.user.currency, locale || req.user.locale, theme || req.user.theme, req.user.id);

        const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        res.json({ message: 'Profil mis à jour', user: formatUser(updated) });
    } catch (err) {
        next(err);
    }
};

// PUT /api/auth/password
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const db = getDb();

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        db.prepare('UPDATE users SET password = ?, updated_at = unixepoch() WHERE id = ?').run(hashed, req.user.id);

        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const db = getDb();

        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email?.toLowerCase());
        if (!user) {
            // For security, always return success
            return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
        }

        const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expires = Date.now() + 3600000; // 1h

        db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
            .run(resetToken, expires, user.id);

        // En production, envoyer un email ici
        console.log(`🔑 Token de réinitialisation pour ${email}: ${resetToken}`);

        res.json({
            message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
            // En dev seulement :
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const db = getDb();

        const user = db.prepare(`
      SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?
    `).get(token, Date.now());

        if (!user) {
            return res.status(400).json({ error: 'Token invalide ou expiré' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
            .run(hashed, user.id);

        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword };
