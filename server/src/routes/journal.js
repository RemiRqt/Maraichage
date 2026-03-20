// Routes pour le journal de bord maraîcher
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  detail,
  create,
  update,
  remove,
} = require('../controllers/journalController');

// Toutes les routes nécessitent une authentification

// GET / — Liste les entrées du journal avec filtres
router.get('/', [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('tag').optional().isString(),
  query('bed_id').optional().isString(),
  query('planting_id').optional().isString(),
], list);

// GET /:id — Détail d'une entrée du journal
router.get('/:id', detail);

// POST / — Crée une nouvelle entrée
router.post('/', [
  body('title').notEmpty().withMessage('Le titre de l\'entrée est requis'),
  body('content').notEmpty().withMessage('Le contenu de l\'entrée est requis'),
  body('entryDate').optional().isISO8601(),
], create);

// PUT /:id — Met à jour une entrée (propriétaire uniquement)
router.put('/:id', [
  body('title').optional().notEmpty(),
  body('content').optional().notEmpty(),
], update);

// DELETE /:id — Supprime une entrée (propriétaire uniquement)
router.delete('/:id', remove);

module.exports = router;
