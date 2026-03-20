// Routes pour la synchronisation hors-ligne
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { push, pull } = require('../controllers/syncController');

// Toutes les routes nécessitent une authentification

// POST /push — Reçoit les modifications effectuées hors-ligne et les applique
router.post('/push', [
  body('changes').isArray().withMessage('Le champ "changes" doit être un tableau'),
], push);

// GET /pull — Retourne tous les enregistrements modifiés depuis la dernière synchronisation
router.get('/pull', [
  query('last_sync').optional().isISO8601().withMessage('La date de dernière synchronisation doit être au format ISO8601'),
], pull);

module.exports = router;
