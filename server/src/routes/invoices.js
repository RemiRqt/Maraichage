const router = require('express').Router();
const prisma = require('../utils/prisma');

// DELETE /:id — Supprime une facture et ses lignes
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET / — Liste toutes les factures
router.get('/', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { supplier: true, lines: { include: { cultivar: true } } },
      orderBy: { importedAt: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
