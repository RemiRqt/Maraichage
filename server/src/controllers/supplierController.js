// Contrôleur pour la gestion des fournisseurs
const prisma = require('../utils/prisma');

// GET / — Liste tous les fournisseurs
const list = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { invoices: true, seedInventory: true } },
      },
    });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'un fournisseur avec ses factures
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { date: 'desc' },
          include: {
            lines: {
              include: { cultivar: { include: { species: true } } },
            },
          },
        },
        _count: { select: { invoices: true, seedInventory: true } },
      },
    });
    if (!supplier) return res.status(404).json({ message: 'Fournisseur non trouvé.' });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée un fournisseur
const create = async (req, res, next) => {
  try {
    const { name, siret, email, phone, website, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Le nom est requis.' });

    const supplier = await prisma.supplier.create({
      data: { name, siret, email, phone, website, address, notes },
    });
    res.status(201).json(supplier);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour un fournisseur
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, siret, email, phone, website, address, notes } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (siret !== undefined) data.siret = siret;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (website !== undefined) data.website = website;
    if (address !== undefined) data.address = address;
    if (notes !== undefined) data.notes = notes;

    const supplier = await prisma.supplier.update({ where: { id }, data });
    res.json(supplier);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime un fournisseur
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
