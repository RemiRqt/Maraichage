// Routes pour la planification assistée
const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  assistedPlanning,
  confirmPlanning,
} = require('../controllers/planningController');

// Toutes les routes nécessitent une authentification

// POST /assisted — Calcule un plan de culture sans rien créer
router.post('/assisted', [
  body('cultivarId').notEmpty().withMessage("L'identifiant du cultivar est requis"),
  body('objectifKg').isFloat({ min: 0.1 }).withMessage("L'objectif en kg doit être un nombre positif"),
  body('desiredHarvestDate').isISO8601().withMessage('La date de récolte souhaitée doit être au format ISO8601'),
], assistedPlanning);

// POST /assisted/confirm — Crée les plantations et tâches depuis un plan validé
router.post('/assisted/confirm', [
  body('cultivarId').notEmpty().withMessage("L'identifiant du cultivar est requis"),
  body('cultureSheetId').notEmpty().withMessage("L'identifiant de la fiche culturale est requis"),
  body('seasonId').notEmpty().withMessage("L'identifiant de la saison est requis"),
  body('bedIds').isArray({ min: 1 }).withMessage('Au moins une planche est requise'),
  body('sowingDate').isISO8601().withMessage('La date de semis est requise'),
], confirmPlanning);

module.exports = router;
