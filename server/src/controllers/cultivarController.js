// Contrôleur pour la gestion des cultivars
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les cultivars avec leur espèce, filtre optionnel par espèce
const list = async (req, res, next) => {
  try {
    const { species_id } = req.query;

    const where = {};
    if (species_id) where.speciesId = species_id;

    const cultivars = await prisma.cultivar.findMany({
      where,
      include: {
        species: true,
        _count: { select: { plantings: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(cultivars);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'un cultivar avec espèce et fiche culturale
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cultivar = await prisma.cultivar.findUnique({
      where: { id },
      include: {
        species: { include: { cultureSheet: true } },
      },
    });

    if (!cultivar) {
      return res.status(404).json({ message: 'Cultivar introuvable.' });
    }

    res.json(cultivar);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée un nouveau cultivar
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      name,
      speciesId,
      description,
    } = req.body;

    const cultivar = await prisma.cultivar.create({
      data: {
        name,
        speciesId,
        description,
      },
      include: { species: true },
    });

    res.status(201).json(cultivar);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour un cultivar
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const {
      name,
      speciesId,
      description,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (speciesId !== undefined) data.speciesId = speciesId;
    if (description !== undefined) data.description = description;

    const cultivar = await prisma.cultivar.update({
      where: { id },
      data,
      include: { species: true },
    });

    res.json(cultivar);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime un cultivar (refusé si des plantations y sont liées)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérification qu'aucune plantation n'est liée à ce cultivar
    const plantingCount = await prisma.planting.count({
      where: { cultivarId: id },
    });

    if (plantingCount > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer ce cultivar : ${plantingCount} plantation(s) y sont associées.`,
      });
    }

    await prisma.cultivar.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, create, update, remove };
