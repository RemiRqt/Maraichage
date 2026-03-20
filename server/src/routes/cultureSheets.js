// Routes pour la gestion des fiches techniques
const router = require('express').Router();
const { body } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const {
  list,
  detail,
  create,
  update,
  remove,
  listTaskTemplates,
} = require('../controllers/cultureSheetController');

// GET / — Liste toutes les fiches techniques
router.get('/', list);

// GET /:id — Détail d'une fiche avec sous-chartes
router.get('/:id', detail);

// GET /:id/task-templates — Liste les modèles de tâches
router.get('/:id/task-templates', listTaskTemplates);

// POST / — Crée une nouvelle fiche technique
router.post('/', requireRole('ADMIN'), [
  body('speciesId').notEmpty().withMessage("L'identifiant de l'espèce est requis"),
], create);

// PUT /:id — Met à jour une fiche technique
router.put('/:id', requireRole('ADMIN'), update);

// DELETE /:id — Supprime une fiche technique
router.delete('/:id', requireRole('ADMIN'), remove);

module.exports = router;
