// Routes pour la gestion des cultivars
const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  list,
  detail,
  create,
  update,
  remove,
} = require('../controllers/cultivarController');

// Toutes les routes nécessitent une authentification

// Validateurs pour la création
const cultivarValidators = [
  body('name').notEmpty().withMessage('Le nom du cultivar est requis'),
  body('speciesId').notEmpty().withMessage("L'identifiant de l'espèce est requis"),
];

// GET / — Liste les cultivars avec filtre optionnel ?species_id=
router.get('/', [
  query('species_id').optional().isString(),
], list);

// GET /:id — Détail d'un cultivar
router.get('/:id', detail);

// POST / — Crée un nouveau cultivar
router.post('/', requireRole('ADMIN'), cultivarValidators, create);

// PUT /:id — Met à jour un cultivar
router.put('/:id', requireRole('ADMIN'), [
  body('name').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('speciesId').optional().notEmpty(),
], update);

// DELETE /:id — Supprime un cultivar (refusé si des plantations y sont liées)
router.delete('/:id', requireRole('ADMIN'), remove);

module.exports = router;
