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

// PUT /:id — Met à jour une fiche technique et ses sous-chartes
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, nurseryChart, transplantChart, directSowChart, yieldChart } = req.body;

    // Vérifier que la fiche existe
    const existing = await prisma.cultureSheet.findUnique({
      where: { id },
      include: { nurseryChart: true, transplantChart: true, directSowChart: true, yieldChart: true },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Fiche technique introuvable.' });
    }

    // Mettre à jour dans une transaction
    await prisma.$transaction(async (tx) => {
      // Notes de la fiche hub
      if (notes !== undefined) {
        await tx.cultureSheet.update({ where: { id }, data: { notes } });
      }

      // Charte pépinière
      if (nurseryChart !== undefined) {
        if (nurseryChart === null && existing.nurseryChart) {
          await tx.nurseryChart.delete({ where: { cultureSheetId: id } });
        } else if (nurseryChart) {
          const { repotStages, ...nurseryData } = nurseryChart;
          if (existing.nurseryChart) {
            await tx.nurseryChart.update({ where: { cultureSheetId: id }, data: nurseryData });
          } else {
            await tx.nurseryChart.create({ data: { ...nurseryData, cultureSheetId: id } });
          }
          // Gérer les étapes de rempotage
          if (repotStages !== undefined) {
            const nc = await tx.nurseryChart.findUnique({ where: { cultureSheetId: id } });
            await tx.nurseryRepotStage.deleteMany({ where: { nurseryChartId: nc.id } });
            if (repotStages.length > 0) {
              await tx.nurseryRepotStage.createMany({
                data: repotStages.map((s, i) => ({
                  nurseryChartId: nc.id,
                  stageNumber: s.stageNumber ?? i + 1,
                  containerType: s.containerType,
                  daysAfterSowing: s.daysAfterSowing,
                })),
              });
            }
          }
        }
      }

      // Charte transplantation
      if (transplantChart !== undefined) {
        if (transplantChart === null && existing.transplantChart) {
          await tx.transplantChart.delete({ where: { cultureSheetId: id } });
        } else if (transplantChart) {
          if (existing.transplantChart) {
            await tx.transplantChart.update({ where: { cultureSheetId: id }, data: transplantChart });
          } else {
            await tx.transplantChart.create({ data: { ...transplantChart, cultureSheetId: id } });
          }
        }
      }

      // Charte semis direct
      if (directSowChart !== undefined) {
        if (directSowChart === null && existing.directSowChart) {
          await tx.directSowChart.delete({ where: { cultureSheetId: id } });
        } else if (directSowChart) {
          if (existing.directSowChart) {
            await tx.directSowChart.update({ where: { cultureSheetId: id }, data: directSowChart });
          } else {
            await tx.directSowChart.create({ data: { ...directSowChart, cultureSheetId: id } });
          }
        }
      }

      // Charte rendement
      if (yieldChart !== undefined) {
        if (yieldChart === null && existing.yieldChart) {
          await tx.yieldChart.delete({ where: { cultureSheetId: id } });
        } else if (yieldChart) {
          if (existing.yieldChart) {
            await tx.yieldChart.update({ where: { cultureSheetId: id }, data: yieldChart });
          } else {
            await tx.yieldChart.create({ data: { ...yieldChart, cultureSheetId: id } });
          }
        }
      }
    });

    // Recharger la fiche complète
    const sheet = await prisma.cultureSheet.findUnique({
      where: { id },
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
