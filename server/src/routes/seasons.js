// Routes pour la gestion des saisons
const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  list,
  create,
  update,
  remove,
  activate,
  duplicate,
} = require('../controllers/seasonController');

// Validation de base pour une saison
const seasonValidators = [
  body('name').notEmpty().withMessage('Le nom de la saison est requis'),
  body('startDate').isISO8601().withMessage('La date de début doit être au format ISO8601'),
  body('endDate').isISO8601().withMessage('La date de fin doit être au format ISO8601'),
];

// Validation partielle pour la mise à jour
const seasonUpdateValidators = [
  body('name').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('startDate').optional().isISO8601().withMessage('La date de début doit être au format ISO8601'),
  body('endDate').optional().isISO8601().withMessage('La date de fin doit être au format ISO8601'),
];

// Toutes les routes nécessitent une authentification

// GET / — Liste toutes les saisons
router.get('/', list);

// POST / — Crée une nouvelle saison (admin uniquement)
router.post('/', requireRole('ADMIN'), seasonValidators, create);

// PUT /:id — Met à jour une saison
router.put('/:id', requireRole('ADMIN'), seasonUpdateValidators, update);

// DELETE /:id — Supprime une saison
router.delete('/:id', requireRole('ADMIN'), remove);

// POST /:id/activate — Active une saison (désactive les autres)
router.post('/:id/activate', requireRole('ADMIN'), activate);

// POST /:id/duplicate — Duplique une saison avec ses plantations planifiées
router.post('/:id/duplicate', requireRole('ADMIN'), [
  body('name').notEmpty().withMessage('Le nom de la nouvelle saison est requis'),
], duplicate);

module.exports = router;
