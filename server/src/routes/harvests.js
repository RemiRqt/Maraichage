// Routes pour la gestion des récoltes
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  create,
  update,
  remove,
  summary,
} = require('../controllers/harvestController');

// Toutes les routes nécessitent une authentification

// GET /summary — Résumé agrégé par cultivar (doit être avant /:id)
router.get('/summary', [
  query('season_id').optional().isString(),
], summary);

// GET / — Liste les récoltes avec filtres
router.get('/', [
  query('planting_id').optional().isString(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('season_id').optional().isString(),
], list);

// POST / — Enregistre une nouvelle récolte
router.post('/', [
  body('plantingId').notEmpty().withMessage("L'identifiant de la plantation est requis"),
  body('harvestDate').isISO8601().withMessage('La date de récolte doit être au format ISO8601'),
  body('quantityKg').isFloat({ min: 0 }).withMessage('La quantité doit être un nombre positif'),
], create);

// PUT /:id — Met à jour une récolte
router.put('/:id', update);

// DELETE /:id — Supprime une récolte
router.delete('/:id', remove);

module.exports = router;
