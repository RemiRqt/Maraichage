// Contrôleur pour la gestion des plantations
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les plantations avec tous les détails et filtres
const list = async (req, res, next) => {
  try {
    const { season_id, bed_id, cultivar_id, status } = req.query;

    const where = {};
    if (season_id) where.seasonId = season_id;
    if (bed_id) where.bedId = bed_id;
    if (cultivar_id) where.cultivarId = cultivar_id;
    if (status) where.status = status;

    const plantings = await prisma.planting.findMany({
      where,
      include: {
        bed: { include: { zone: true } },
        cultivar: {
          include: {
            species: {
              include: {
                cultureSheet: {
                  include: { transplantChart: true, directSowChart: true, yieldChart: true },
                },
              },
            },
          },
        },
        season: true,
        harvests: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(plantings);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une plantation avec génération automatique des tâches
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      seasonId,
      bedId,
      cultivarId,
      cultureSheetId,
      sowingDate,
      transplantDate,
      quantityPlanted,
      successionOrder,
      notes,
      status,
    } = req.body;

    // Récupérer la planche pour avoir sa superficie
    const bed = await prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed) {
      return res.status(404).json({ message: 'Planche introuvable.' });
    }

    let expectedHarvestDate = null;
    let expectedYieldKg = null;
    let cultureSheet = null;

    // Récupérer la fiche technique si fournie
    if (cultureSheetId) {
      cultureSheet = await prisma.cultureSheet.findUnique({
        where: { id: cultureSheetId },
        include: {
          transplantChart: true,
          directSowChart: true,
          yieldChart: true,
          taskTemplates: { orderBy: { positionOrder: 'asc' } },
        },
      });

      if (cultureSheet) {
        const daysToMaturity = cultureSheet.transplantChart?.daysToMaturity
          || cultureSheet.directSowChart?.daysToMaturity;

        // Calcul de la date de récolte prévue
        if (sowingDate && daysToMaturity) {
          const sowing = new Date(sowingDate);
          expectedHarvestDate = new Date(sowing);
          expectedHarvestDate.setDate(sowing.getDate() + daysToMaturity);
        }

        // Calcul du rendement prévu (depuis yield/30m → yield/m²)
        const yieldKgPerM2 = cultureSheet.yieldChart?.yieldKgPer30m
          ? parseFloat(cultureSheet.yieldChart.yieldKgPer30m) / 30
          : null;
        if (yieldKgPerM2 && bed.areaM2) {
          expectedYieldKg = parseFloat((parseFloat(bed.areaM2) * yieldKgPerM2).toFixed(2));
        }
      }
    }

    // Vérification de la rotation des cultures
    // Récupérer les 2 dernières plantations sur cette planche
    const previousPlantings = await prisma.planting.findMany({
      where: {
        bedId,
        status: { notIn: ['PLANIFIE'] },
      },
      include: {
        cultivar: { include: { species: true } },
        season: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    // Récupérer la famille du cultivar actuel pour vérifier la rotation
    const currentCultivar = await prisma.cultivar.findUnique({
      where: { id: cultivarId },
      include: { species: true },
    });

    let rotationWarning = null;
    if (currentCultivar?.species?.family && previousPlantings.length > 0) {
      const sameFamily = previousPlantings.find(
        (p) => p.cultivar?.species?.family === currentCultivar.species.family
      );
      if (sameFamily) {
        rotationWarning = `Attention : la même famille botanique (${currentCultivar.species.family}) a été cultivée sur cette planche lors de la saison "${sameFamily.season?.name || 'précédente'}". Un risque de fatigue du sol existe.`;
      }
    }

    // Créer la plantation dans une transaction
    const planting = await prisma.$transaction(async (tx) => {
      const newPlanting = await tx.planting.create({
        data: {
          seasonId,
          bedId,
          cultivarId,
          cultureSheetId,
          sowingDate: sowingDate ? new Date(sowingDate) : null,
          transplantDate: transplantDate ? new Date(transplantDate) : null,
          expectedHarvestDate,
          expectedYieldKg,
          quantityPlanted: quantityPlanted || 0,
          successionOrder: successionOrder || 1,
          status: status || 'PLANIFIE',
          notes,
        },
        include: {
          bed: { include: { zone: true } },
          cultivar: { include: { species: true } },
          season: true,
        },
      });

      // Générer automatiquement les tâches depuis les modèles de la fiche culturale
      if (cultureSheet?.taskTemplates?.length > 0 && sowingDate) {
        const sowingDateObj = new Date(sowingDate);

        for (const template of cultureSheet.taskTemplates) {
          const offsetDays = template.direction === 'AVANT'
            ? -template.daysOffset
            : template.daysOffset;
          const scheduledDate = new Date(sowingDateObj);
          scheduledDate.setDate(sowingDateObj.getDate() + offsetDays);

          await tx.task.create({
            data: {
              plantingId: newPlanting.id,
              bedId,
              taskTemplateId: template.id,
              name: template.name,
              description: template.description,
              scheduledDate,
              priority: 'NORMALE',
              status: 'A_FAIRE',
            },
          });
        }
      }

      // Créer un lot de pépinière si la méthode de semis inclut PEPINIERE
      if (
        cultureSheet?.sowingMethod &&
        (cultureSheet.sowingMethod === 'PEPINIERE' || cultureSheet.sowingMethod === 'LES_DEUX') &&
        sowingDate
      ) {
        const transplantExpected = new Date(sowingDate);
        const nurseryDays = cultureSheet.transplantChart?.nurseryDurationDays || 30;
        transplantExpected.setDate(transplantExpected.getDate() + nurseryDays);

        await tx.nurseryBatch.create({
          data: {
            plantingId: newPlanting.id,
            cultivarId,
            sowingDate: new Date(sowingDate),
            containerType: 'PLAQUE_104', // Valeur par défaut, modifiable ensuite
            containerCount: 1,
            cellsPerContainer: 104,
            totalSeedsSown: newPlanting.quantityPlanted || 0,
            expectedTransplantDate: transplantExpected,
            status: 'SEME',
          },
        });
      }

      return newPlanting;
    });

    // Réponse enrichie avec l'avertissement de rotation si présent
    const response = { ...planting };
    if (rotationWarning) {
      response.rotationWarning = rotationWarning;
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail complet d'une plantation avec tâches, récoltes et pépinière
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const planting = await prisma.planting.findUnique({
      where: { id },
      include: {
        bed: { include: { zone: true } },
        cultivar: { include: { species: true } },
        season: true,
        cultureSheet: {
          include: {
            species: true,
            transplantChart: true,
            directSowChart: true,
            yieldChart: true,
            nurseryChart: true,
          },
        },
        tasks: { orderBy: { scheduledDate: 'asc' } },
        harvests: { orderBy: { date: 'desc' } },
        nurseryBatches: {
          orderBy: { sowingDate: 'desc' },
          include: { cultivar: { include: { species: true } } },
        },
      },
    });

    if (!planting) {
      return res.status(404).json({ message: 'Plantation introuvable.' });
    }

    res.json(planting);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une plantation
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sowingDate,
      transplantDate,
      expectedHarvestDate,
      actualFirstHarvestDate,
      expectedYieldKg,
      notes,
      cultureSheetId,
    } = req.body;

    const data = {};
    if (sowingDate !== undefined) data.sowingDate = sowingDate ? new Date(sowingDate) : null;
    if (transplantDate !== undefined) data.transplantDate = transplantDate ? new Date(transplantDate) : null;
    if (expectedHarvestDate !== undefined) data.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : null;
    if (actualFirstHarvestDate !== undefined) data.actualFirstHarvestDate = actualFirstHarvestDate ? new Date(actualFirstHarvestDate) : null;
    if (expectedYieldKg !== undefined) data.expectedYieldKg = expectedYieldKg;
    if (notes !== undefined) data.notes = notes;
    if (cultureSheetId !== undefined) data.cultureSheetId = cultureSheetId;

    const planting = await prisma.planting.update({
      where: { id },
      data,
      include: {
        bed: { include: { zone: true } },
        cultivar: { include: { species: true } },
        season: true,
      },
    });

    res.json(planting);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/status — Met à jour uniquement le statut d'une plantation
const updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const planting = await prisma.planting.update({
      where: { id },
      data: { status },
    });

    res.json(planting);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une plantation et ses tâches en cascade
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // La suppression en cascade des tâches est gérée par Prisma (onDelete: Cascade)
    await prisma.planting.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, create, update, updateStatus, remove };
