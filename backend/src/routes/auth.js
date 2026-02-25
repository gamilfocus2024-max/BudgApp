const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const registerValidation = [
    body('name').trim().notEmpty().withMessage('Le nom est requis').isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Le mot de passe doit contenir majuscule, minuscule et chiffre')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
