// Contrôleur pour la gestion des saisons maraîchères
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Retourne toutes les saisons triées par date de début décroissante
const list = async (req, res, next) => {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'desc' },
    });
    res.json(seasons);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une nouvelle saison
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { name, startDate, endDate } = req.body;

    const season = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    res.status(201).json(season);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une saison existante
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { name, startDate, endDate } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);

    const season = await prisma.season.update({
      where: { id },
      data,
    });

    res.json(season);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une saison si aucune plantation n'y est liée
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérification qu'aucune plantation n'est liée à cette saison
    const plantingCount = await prisma.planting.count({
      where: { seasonId: id },
    });

    if (plantingCount > 0) {
      return res.status(409).json({
        message: `Impossible de supprimer cette saison : ${plantingCount} plantation(s) y sont associées.`,
      });
    }

    await prisma.season.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// POST /:id/activate — Active une saison et désactive toutes les autres
const activate = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Transaction : désactiver toutes puis activer la cible
    const season = await prisma.$transaction(async (tx) => {
      // Désactiver toutes les saisons
      await tx.season.updateMany({
        data: { isActive: false },
      });

      // Activer la saison demandée
      return tx.season.update({
        where: { id },
        data: { isActive: true },
      });
    });

    res.json(season);
  } catch (err) {
    next(err);
  }
};

// POST /:id/duplicate — Duplique une saison avec ses plantations planifiées (PLANIFIE)
const duplicate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { name } = req.body;

    // Récupérer la saison source avec ses plantations planifiées
    const sourceSeason = await prisma.season.findUnique({
      where: { id },
      include: {
        plantings: {
          where: { status: 'PLANIFIE' },
        },
      },
    });

    if (!sourceSeason) {
      return res.status(404).json({ message: 'Saison introuvable.' });
    }

    // Créer la nouvelle saison avec les plantations dupliquées
    const newSeason = await prisma.$transaction(async (tx) => {
      // Créer la nouvelle saison
      const created = await tx.season.create({
        data: {
          name,
          startDate: sourceSeason.startDate,
          endDate: sourceSeason.endDate,
          isActive: false,
        },
      });

      // Dupliquer chaque plantation planifiée
      for (const planting of sourceSeason.plantings) {
        await tx.planting.create({
          data: {
            seasonId: created.id,
            bedId: planting.bedId,
            cultivarId: planting.cultivarId,
            cultureSheetId: planting.cultureSheetId,
            sowingDate: planting.sowingDate,
            quantityPlanted: planting.quantityPlanted || 0,
            status: 'PLANIFIE',
            notes: planting.notes,
          },
        });
      }

      return tx.season.findUnique({
        where: { id: created.id },
        include: { plantings: true },
      });
    });

    res.status(201).json(newSeason);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove, activate, duplicate };
