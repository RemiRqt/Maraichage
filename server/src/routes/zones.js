// Routes pour la gestion des zones maraîchères
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { list, detail } = require('../controllers/zoneController');

// Toutes les routes nécessitent une authentification

// GET / — Liste toutes les zones avec le nombre de planches et de plantations actives
router.get('/', list);

// GET /:id — Détail d'une zone avec toutes ses planches
router.get('/:id', detail);

module.exports = router;
