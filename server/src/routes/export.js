// Routes pour l'export des données
const router = require('express').Router();
const { param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { exportData } = require('../controllers/exportController');

// Entités exportables
const ENTITES_VALIDES = ['plantings', 'harvests', 'tasks', 'seeds', 'weather', 'nursery'];

// Toutes les routes nécessitent une authentification

// GET /:entity — Exporte les données d'une entité au format choisi
router.get('/:entity', [
  param('entity').isIn(ENTITES_VALIDES).withMessage(`Entité invalide. Valeurs acceptées : ${ENTITES_VALIDES.join(', ')}`),
  query('format').optional().isIn(['csv', 'xlsx', 'pdf']).withMessage("Format invalide. Valeurs acceptées : csv, xlsx, pdf"),
  query('season_id').optional().isString(),
], exportData);

module.exports = router;
