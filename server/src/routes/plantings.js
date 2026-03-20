// Routes pour la gestion des plantations
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  detail,
  create,
  update,
  updateStatus,
  remove,
} = require('../controllers/plantingController');

// Toutes les routes nécessitent une authentification

// Validateurs pour la création
const plantingValidators = [
  body('seasonId').notEmpty().withMessage("L'identifiant de la saison est requis"),
  body('bedId').notEmpty().withMessage("L'identifiant de la planche est requis"),
  body('cultivarId').notEmpty().withMessage("L'identifiant du cultivar est requis"),
];

// GET / — Liste les plantations avec filtres
router.get('/', [
  query('season_id').optional().isString(),
  query('bed_id').optional().isString(),
  query('cultivar_id').optional().isString(),
  query('status').optional().isString(),
], list);

// POST / — Crée une plantation et génère automatiquement les tâches
router.post('/', plantingValidators, create);

// GET /:id — Détail complet d'une plantation
router.get('/:id', detail);

// PUT /:id — Met à jour une plantation
router.put('/:id', update);

// PATCH /:id/status — Met à jour uniquement le statut d'une plantation
router.patch('/:id/status', [
  body('status').notEmpty().withMessage('Le statut est requis'),
], updateStatus);

// DELETE /:id — Supprime une plantation et ses tâches en cascade
router.delete('/:id', remove);

module.exports = router;
