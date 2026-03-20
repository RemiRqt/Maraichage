// Routes pour les analyses et statistiques
const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  cultures,
  beds,
  seasonSummary,
  compare,
  dashboard,
} = require('../controllers/analyticsController');

// Toutes les routes nécessitent une authentification

// GET /dashboard — Tableau de bord avec les données clés du moment
router.get('/dashboard', [
  query('season_id').optional().isString(),
], dashboard);

// GET /cultures — Analyse par cultivar pour une saison donnée
router.get('/cultures', [
  query('season_id').optional().isString(),
], cultures);

// GET /beds — Analyse par planche pour une saison donnée
router.get('/beds', [
  query('season_id').optional().isString(),
], beds);

// GET /season-summary — Résumé complet d'une saison
router.get('/season-summary', [
  query('season_id').notEmpty().withMessage("L'identifiant de la saison est requis"),
], seasonSummary);

// GET /compare — Comparaison côte à côte de deux saisons
router.get('/compare', [
  query('season_a').notEmpty().withMessage("L'identifiant de la saison A est requis"),
  query('season_b').notEmpty().withMessage("L'identifiant de la saison B est requis"),
], compare);

module.exports = router;
