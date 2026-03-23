// Routes pour la gestion des tâches agricoles
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  create,
  update,
  complete,
  uncomplete,
  remove,
} = require('../controllers/taskController');

// Toutes les routes nécessitent une authentification

// GET / — Liste les tâches avec filtres multiples
router.get('/', [
  query('date').optional().isISO8601(),
  query('status').optional().isString(),
  query('bed_id').optional().isString(),
  query('zone_id').optional().isString(),
  query('planting_id').optional().isString(),
  query('priority').optional().isString(),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
], list);

// POST / — Crée une tâche libre (non liée à une fiche culturale)
router.post('/', [
  body('name').notEmpty().withMessage('Le nom de la tâche est requis'),
  body('scheduledDate').optional().isISO8601(),
], create);

// PUT /:id — Met à jour une tâche
router.put('/:id', update);

// PATCH /:id/complete — Marque une tâche comme effectuée
router.patch('/:id/complete', [
  body('actualDurationHours').optional().isFloat({ min: 0 }),
], complete);

// PATCH /:id/uncomplete — Annule la validation d'une tâche
router.patch('/:id/uncomplete', uncomplete);

// DELETE /:id — Supprime une tâche
router.delete('/:id', remove);

module.exports = router;
