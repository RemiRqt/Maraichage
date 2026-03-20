// Routes fournisseurs
const router = require('express').Router();
const prisma = require('../utils/prisma');
const { list, getOne, create, update, remove } = require('../controllers/supplierController');

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
