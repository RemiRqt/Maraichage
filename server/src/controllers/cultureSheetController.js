// Contrôleur pour la gestion des fiches techniques (hub + sous-chartes)
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// Include standard pour les requêtes
const FULL_INCLUDE = {
  species: true,
  nurseryChart: { include: { repotStages: { orderBy: { stageNumber: 'asc' } } } },
  transplantChart: true,
  directSowChart: true,
  yieldChart: true,
  taskTemplates: { orderBy: { positionOrder: 'asc' } },
  _count: { select: { plantings: true } },
};

// GET / — Liste toutes les fiches techniques avec espèce et sous-chartes
const list = async (req, res, next) => {
  try {
    const { sowingMethod, species_id } = req.query;
    const where = {};
    if (sowingMethod) where.sowingMethod = sowingMethod;
    if (species_id) where.speciesId = species_id;

    const sheets = await prisma.cultureSheet.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { species: { name: 'asc' } },
    });

    res.json(sheets);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'une fiche avec toutes les sous-chartes
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sheet = await prisma.cultureSheet.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });

    if (!sheet) {
      return res.status(404).json({ message: 'Fiche technique introuvable.' });
    }

    res.json(sheet);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une fiche technique pour une espèce
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { speciesId, notes } = req.body;

    const sheet = await prisma.cultureSheet.create({
      data: { speciesId, notes },
      include: FULL_INCLUDE,
    });

    res.status(201).json(sheet);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour les notes d'une fiche technique
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const sheet = await prisma.cultureSheet.update({
      where: { id },
      data: { notes },
      include: FULL_INCLUDE,
    });

    res.json(sheet);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une fiche technique et toutes ses sous-chartes
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.cultureSheet.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /:id/task-templates — Liste les modèles de tâches d'une fiche
const listTaskTemplates = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sheet = await prisma.cultureSheet.findUnique({ where: { id } });
    if (!sheet) {
      return res.status(404).json({ message: 'Fiche technique introuvable.' });
    }

    const templates = await prisma.taskTemplate.findMany({
      where: { cultureSheetId: id },
      orderBy: { positionOrder: 'asc' },
    });

    res.json(templates);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, create, update, remove, listTaskTemplates };
