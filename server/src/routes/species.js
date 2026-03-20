// Routes pour la gestion des espèces végétales
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  list,
  detail,
  create,
  update,
  remove,
} = require('../controllers/speciesController');

// Toutes les routes nécessitent une authentification

// Validateurs pour la création/mise à jour
const speciesValidators = [
  body('name').notEmpty().withMessage("Le nom de l'espèce est requis"),
  body('family').optional().isString(),
  body('category').optional().isString(),
];

// GET / — Liste les espèces avec filtres optionnels ?family= ?category=
router.get('/', [
  query('family').optional().isString(),
  query('category').optional().isString(),
], list);

// GET /:id — Détail d'une espèce
router.get('/:id', detail);

// POST / — Crée une nouvelle espèce
router.post('/', requireRole('ADMIN'), speciesValidators, create);

// PUT /:id — Met à jour une espèce
router.put('/:id', requireRole('ADMIN'), [
  body('name').optional().notEmpty().withMessage("Le nom ne peut pas être vide"),
  body('family').optional().isString(),
  body('category').optional().isString(),
], update);

// DELETE /:id — Supprime une espèce (refusé si des cultivars y sont liés)
router.delete('/:id', requireRole('ADMIN'), remove);

module.exports = router;
