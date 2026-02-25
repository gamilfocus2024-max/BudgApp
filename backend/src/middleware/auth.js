const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const db = getDb();
        const user = db.prepare('SELECT id, name, email, role, currency, theme, is_active FROM users WHERE id = ?').get(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Compte désactivé' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
        }
        return res.status(401).json({ error: 'Token invalide' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
};

module.exports = { authenticate, isAdmin };
