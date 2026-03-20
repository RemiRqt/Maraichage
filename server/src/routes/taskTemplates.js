// Routes pour la gestion des modèles de tâches
const router = require('express').Router();
const { body } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const {
  create,
  update,
  remove,
} = require('../controllers/taskTemplateController');

const templateValidators = [
  body('cultureSheetId').notEmpty().withMessage("L'identifiant de la fiche technique est requis"),
  body('name').notEmpty().withMessage('Le nom du modèle de tâche est requis'),
  body('daysOffset').isInt().withMessage('Le décalage en jours doit être un entier'),
  body('direction').isIn(['AVANT', 'APRES']).withMessage('Direction doit être AVANT ou APRES'),
];

// POST / — Crée un nouveau modèle de tâche
router.post('/', requireRole('ADMIN'), templateValidators, create);

// PUT /:id — Met à jour un modèle de tâche
router.put('/:id', requireRole('ADMIN'), [
  body('name').optional().notEmpty(),
  body('daysOffset').optional().isInt(),
  body('direction').optional().isIn(['AVANT', 'APRES']),
], update);

// DELETE /:id — Supprime un modèle de tâche
router.delete('/:id', requireRole('ADMIN'), remove);

module.exports = router;
