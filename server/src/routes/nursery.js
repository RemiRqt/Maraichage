// Routes pour la gestion des lots de pépinière
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  list,
  create,
  update,
  updateStatus,
  remove,
} = require('../controllers/nurseryController');

// Toutes les routes nécessitent une authentification

// GET / — Liste les lots de pépinière avec filtres
router.get('/', [
  query('status').optional().isString(),
  query('cultivar_id').optional().isString(),
], list);

// POST / — Crée un nouveau lot de pépinière
router.post('/', [
  body('plantingId').optional({ nullable: true }),
  body('cultivarId').notEmpty().withMessage("L'identifiant du cultivar est requis"),
  body('sowingDate').isISO8601().withMessage('La date de semis est requise'),
], create);

// PUT /:id — Met à jour un lot de pépinière
router.put('/:id', update);

// PATCH /:id/status — Met à jour uniquement le statut d'un lot
router.patch('/:id/status', [
  body('status').notEmpty().withMessage('Le statut est requis'),
], updateStatus);

// DELETE /:id — Supprime un lot de pépinière
router.delete('/:id', remove);

module.exports = router;
