// Contrôleur pour la gestion des lots de pépinière
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les lots de pépinière avec filtres
const list = async (req, res, next) => {
  try {
    const { status, cultivar_id, season_id } = req.query;

    const where = {};
    if (status) where.status = status;
    if (cultivar_id) where.cultivarId = cultivar_id;
    // season_id filtre via planting OU directement
    if (season_id) {
      where.OR = [
        { planting: { seasonId: season_id } },
        { plantingId: null }, // lots sans plantation : toujours visibles
      ];
    }

    const batches = await prisma.nurseryBatch.findMany({
      where,
      include: {
        planting: {
          include: {
            bed: { include: { zone: true } },
            season: true,
          },
        },
        cultivar: { include: { species: true } },
        seedInventory: true,
      },
      orderBy: { sowingDate: 'desc' },
    });

    res.json(batches);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée un nouveau lot de pépinière
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      plantingId,
      cultivarId,
      seedInventoryId,
      sowingDate,
      containerType,
      containerCount,
      cellsPerContainer,
      totalSeedsSown,
      germinationCount,
      notes,
    } = req.body;

    if (!cultivarId) return res.status(400).json({ error: 'cultivarId requis' });

    const seedsToConsume = totalSeedsSown ? parseInt(totalSeedsSown) : 0;

    // Vérifier le stock si un lot de graines est lié
    if (seedInventoryId && seedsToConsume > 0) {
      const stock = await prisma.seedInventory.findUnique({ where: { id: seedInventoryId } });
      if (!stock) return res.status(404).json({ error: 'Lot de graines introuvable' });
      if (parseFloat(stock.quantityInStock) < seedsToConsume) {
        return res.status(409).json({
          error: `Stock insuffisant : ${parseFloat(stock.quantityInStock)} disponibles, ${seedsToConsume} demandés`,
        });
      }
    }

    let germinationRate = null;
    let expectedTransplantDate = null;

    if (germinationCount !== undefined && seedsToConsume) {
      germinationRate = parseFloat(((germinationCount / seedsToConsume) * 100).toFixed(1));
    }

    if (plantingId) {
      const planting = await prisma.planting.findUnique({
        where: { id: plantingId },
        include: { cultureSheet: { include: { transplantChart: true } } },
      });
      if (planting?.cultureSheet?.transplantChart?.nurseryDurationDays) {
        const sowing = new Date(sowingDate);
        expectedTransplantDate = new Date(sowing);
        expectedTransplantDate.setDate(sowing.getDate() + planting.cultureSheet.transplantChart.nurseryDurationDays);
      }
    }

    const batch = await prisma.nurseryBatch.create({
      data: {
        plantingId: plantingId || null,
        cultivarId,
        seedInventoryId: seedInventoryId || null,
        seedsConsumed: seedInventoryId ? seedsToConsume : null,
        sowingDate: new Date(sowingDate),
        containerType: containerType || 'ALVEOLES_60',
        containerCount: containerCount ? parseInt(containerCount) : 1,
        cellsPerContainer: cellsPerContainer ? parseInt(cellsPerContainer) : 60,
        totalSeedsSown: seedsToConsume,
        germinationCount: germinationCount ? parseInt(germinationCount) : null,
        germinationRate,
        expectedTransplantDate,
        status: 'SEME',
        notes,
      },
      include: {
        planting: { include: { season: true, bed: true } },
        cultivar: { include: { species: true } },
        seedInventory: true,
      },
    });

    // Déduire du stock
    if (seedInventoryId && seedsToConsume > 0) {
      await prisma.seedInventory.update({
        where: { id: seedInventoryId },
        data: { quantityInStock: { decrement: seedsToConsume } },
      });
    }

    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour un lot de pépinière et recalcule le taux de germination
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sowingDate,
      containerType,
      containerCount,
      cellsPerContainer,
      totalSeedsSown,
      germinationCount,
      expectedTransplantDate,
      actualTransplantDate,
      notes,
    } = req.body;

    const data = {};
    if (sowingDate !== undefined) data.sowingDate = new Date(sowingDate);
    if (containerType !== undefined) data.containerType = containerType;
    if (containerCount !== undefined) data.containerCount = parseInt(containerCount);
    if (cellsPerContainer !== undefined) data.cellsPerContainer = parseInt(cellsPerContainer);
    if (totalSeedsSown !== undefined) data.totalSeedsSown = parseInt(totalSeedsSown);
    if (germinationCount !== undefined) data.germinationCount = parseInt(germinationCount);
    if (expectedTransplantDate !== undefined) data.expectedTransplantDate = new Date(expectedTransplantDate);
    if (actualTransplantDate !== undefined) data.actualTransplantDate = new Date(actualTransplantDate);
    if (notes !== undefined) data.notes = notes;

    // Recalculer le taux de germination si le nombre de germinations change
    if (germinationCount !== undefined) {
      // Récupérer le lot existant pour avoir le totalSeedsSown actuel
      const existing = await prisma.nurseryBatch.findUnique({ where: { id } });
      const currentTotalSeedsSown = data.totalSeedsSown || existing?.totalSeedsSown;

      if (currentTotalSeedsSown && currentTotalSeedsSown > 0) {
        data.germinationRate = parseFloat(
          ((parseInt(germinationCount) / currentTotalSeedsSown) * 100).toFixed(1)
        );
      }
    }

    const batch = await prisma.nurseryBatch.update({
      where: { id },
      data,
      include: {
        cultivar: { include: { species: true } },
      },
    });

    res.json(batch);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/status — Met à jour le statut d'un lot de pépinière
const updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const batch = await prisma.nurseryBatch.update({
      where: { id },
      data: { status },
    });

    res.json(batch);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime un lot de pépinière
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.nurseryBatch.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, updateStatus, remove };
