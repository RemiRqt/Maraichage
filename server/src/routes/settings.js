// Routes pour les paramètres de l'application et le profil utilisateur
const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  update,
  getProfile,
  updateProfile,
} = require('../controllers/settingsController');

// Toutes les routes nécessitent une authentification

// GET /profile — Retourne le profil de l'utilisateur connecté (avant GET /)
router.get('/profile', getProfile);

// PUT /profile — Met à jour le profil (nom, email, mot de passe)
router.put('/profile', [
  body('name').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('email').optional().isEmail().withMessage("L'adresse email est invalide"),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
], updateProfile);

// GET / — Retourne tous les paramètres sous forme clé-valeur
router.get('/', list);

// PUT / — Met à jour plusieurs paramètres en une seule requête
router.put('/', [
  body('settings')
    .isObject()
    .withMessage('Le champ "settings" doit être un objet clé-valeur'),
], update);

module.exports = router;
