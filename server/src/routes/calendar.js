// Routes pour le calendrier agricole
const router = require('express').Router();
const { query } = require('express-validator');
const { events } = require('../controllers/calendarController');

// GET /events — Agrège les événements d'un mois donné
router.get('/events', [
  query('season_id').optional().isString(),
  query('year').optional().isInt(),
  query('month').optional().isInt({ min: 1, max: 12 }),
], events);

module.exports = router;
