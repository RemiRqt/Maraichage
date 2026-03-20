// Contrôleur pour la gestion des espèces végétales
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les espèces avec filtres optionnels
const list = async (req, res, next) => {
  try {
    const { family, category, search } = req.query;

    const where = {};
    if (family) where.family = { contains: family };
    if (category) where.category = { contains: category };
    if (search) where.name = { contains: search };

    const species = await prisma.species.findMany({
      where,
      include: {
        _count: { select: { cultivars: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(species);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'une espèce avec ses cultivars
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const species = await prisma.species.findUnique({
      where: { id },
      include: {
        cultivars: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!species) {
      return res.status(404).json({ message: 'Espèce introuvable.' });
    }

    res.json(species);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une nouvelle espèce
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { name, family, category, notes } = req.body;

    const species = await prisma.species.create({
      data: { name, family, category, notes },
    });

    res.status(201).json(species);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une espèce
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { name, family, category, notes } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (family !== undefined) data.family = family;
    if (category !== undefined) data.category = category;
    if (notes !== undefined) data.notes = notes;

    const species = await prisma.species.update({
      where: { id },
      data,
    });

    res.json(species);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une espèce (refusé si des cultivars y sont liés)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérification qu'aucun cultivar n'est lié à cette espèce
    const cultivarCount = await prisma.cultivar.count({
      where: { speciesId: id },
    });

    if (cultivarCount > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer cette espèce : ${cultivarCount} cultivar(s) y sont associés.`,
      });
    }

    await prisma.species.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, create, update, remove };
