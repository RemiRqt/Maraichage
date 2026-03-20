// ============================================================
// Routes Authentification
// ============================================================

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');

// Rate limiting strict sur les routes d'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/login — Connexion
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  validate,
  authController.login
);

// POST /auth/register — Création de compte (setup initial)
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('name').notEmpty().withMessage('Le nom est requis'),
  ],
  validate,
  authController.register
);

// POST /auth/refresh — Rafraîchir le token
router.post('/refresh', authController.refresh);

// POST /auth/logout — Déconnexion
router.post('/logout', authController.logout);

module.exports = router;
