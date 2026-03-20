// Routes pour la gestion des planches de culture
const router = require('express').Router();
const { query, body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { list, detail, update } = require('../controllers/bedController');

// Toutes les routes nécessitent une authentification

// GET / — Liste toutes les planches, avec filtre optionnel par zone
router.get('/', [
  query('zone_id').optional().isString(),
], list);

// GET /:id — Détail d'une planche avec historique des plantations
router.get('/:id', detail);

// PUT /:id — Met à jour les dimensions et notes d'une planche
router.put('/:id', requireRole('ADMIN'), [
  body('lengthM').optional().isFloat({ min: 0.1 }).withMessage('La longueur doit être un nombre positif'),
  body('widthM').optional().isFloat({ min: 0.1 }).withMessage('La largeur doit être un nombre positif'),
  body('notes').optional().isString(),
], update);

module.exports = router;
