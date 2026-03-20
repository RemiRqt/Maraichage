// Routes pour les données météorologiques
const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  history,
  today,
  forecast,
} = require('../controllers/weatherController');

// Toutes les routes nécessitent une authentification

// GET /today — Données météo du jour (doit être avant /forecast et avant /)
router.get('/today', today);

// GET /forecast — Prévisions météo depuis Open-Meteo
router.get('/forecast', forecast);

// GET / — Historique météo avec filtres de dates
router.get('/', [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
], history);

module.exports = router;
