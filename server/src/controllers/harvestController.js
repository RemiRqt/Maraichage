// Contrôleur pour la gestion des récoltes
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return parseFloat(String(v)) || 0;
};

// GET / — Liste les récoltes avec filtres et relations
const list = async (req, res, next) => {
  try {
    const { planting_id, date_from, date_to, season_id } = req.query;

    const where = {};

    if (planting_id) where.plantingId = planting_id;

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }

    // Filtre par saison via la plantation
    if (season_id) {
      where.planting = { seasonId: season_id };
    }

    const harvests = await prisma.harvest.findMany({
      where,
      include: {
        planting: {
          include: {
            cultivar: { include: { species: true } },
            bed: { include: { zone: true } },
            season: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(harvests);
  } catch (err) {
    next(err);
  }
};

// POST / — Enregistre une récolte et met à jour la plantation
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      plantingId,
      date,
      quantityKg,
      qualityRating,
      notes,
    } = req.body;

    const harvest = await prisma.$transaction(async (tx) => {
      // Créer l'enregistrement de récolte
      const newHarvest = await tx.harvest.create({
        data: {
          plantingId,
          date: new Date(date),
          quantityKg: parseFloat(quantityKg),
          qualityRating,
          notes,
        },
        include: {
          planting: {
            include: {
              cultivar: { include: { species: true } },
              bed: true,
              season: true,
            },
          },
        },
      });

      // Mettre à jour la plantation : date de première récolte et statut
      const planting = await tx.planting.findUnique({
        where: { id: plantingId },
      });

      const updateData = { status: 'EN_RECOLTE' };

      // Définir la date de première récolte si non encore renseignée
      if (!planting.actualFirstHarvestDate) {
        updateData.actualFirstHarvestDate = new Date(date);
      }

      await tx.planting.update({
        where: { id: plantingId },
        data: updateData,
      });

      return newHarvest;
    });

    res.status(201).json(harvest);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une récolte
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, quantityKg, qualityRating, notes } = req.body;

    const data = {};
    if (date !== undefined) data.date = new Date(date);
    if (quantityKg !== undefined) data.quantityKg = parseFloat(quantityKg);
    if (qualityRating !== undefined) data.qualityRating = qualityRating;
    if (notes !== undefined) data.notes = notes;

    const harvest = await prisma.harvest.update({
      where: { id },
      data,
    });

    res.json(harvest);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une récolte
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.harvest.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /summary — Résumé agrégé par cultivar avec comparaison au rendement prévu
const summary = async (req, res, next) => {
  try {
    const { season_id } = req.query;

    // Récupérer toutes les récoltes de la saison avec les détails des plantations
    const where = {};
    if (season_id) {
      where.planting = { seasonId: season_id };
    }

    const harvests = await prisma.harvest.findMany({
      where,
      include: {
        planting: {
          include: {
            cultivar: { include: { species: true } },
          },
        },
      },
    });

    // Regrouper par cultivar
    const summaryMap = {};

    for (const harvest of harvests) {
      const cultivarId = harvest.planting?.cultivarId;
      const cultivar = harvest.planting?.cultivar;

      if (!cultivarId) continue;

      if (!summaryMap[cultivarId]) {
        summaryMap[cultivarId] = {
          cultivar,
          totalHarvestedKg: 0,
          totalExpectedYieldKg: 0,
          harvestCount: 0,
          plantingIds: new Set(),
        };
      }

      summaryMap[cultivarId].totalHarvestedKg += toNum(harvest.quantityKg);
      summaryMap[cultivarId].harvestCount += 1;
      summaryMap[cultivarId].plantingIds.add(harvest.plantingId);
    }

    // Récupérer les rendements prévus pour les plantations concernées
    for (const cultivarId of Object.keys(summaryMap)) {
      const plantingIds = Array.from(summaryMap[cultivarId].plantingIds);

      const plantings = await prisma.planting.findMany({
        where: { id: { in: plantingIds } },
        select: { expectedYieldKg: true },
      });

      summaryMap[cultivarId].totalExpectedYieldKg = plantings.reduce(
        (sum, p) => sum + toNum(p.expectedYieldKg),
        0
      );

      // Calcul du taux de rendement
      const expected = summaryMap[cultivarId].totalExpectedYieldKg;
      summaryMap[cultivarId].yieldRatePct = expected > 0
        ? parseFloat(((summaryMap[cultivarId].totalHarvestedKg / expected) * 100).toFixed(1))
        : null;

      // Retirer le Set non sérialisable
      delete summaryMap[cultivarId].plantingIds;
    }

    // Trier par quantité récoltée décroissante
    const result = Object.values(summaryMap).sort(
      (a, b) => b.totalHarvestedKg - a.totalHarvestedKg
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove, summary };
