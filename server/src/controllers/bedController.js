// Contrôleur pour la gestion des planches de culture
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// Statuts considérés comme "actifs" pour une plantation
const STATUTS_ACTIFS = [
  'PLANIFIE',
  'SEME',
  'EN_PEPINIERE',
  'TRANSPLANTE',
  'EN_CROISSANCE',
  'EN_RECOLTE',
];

// GET / — Liste toutes les planches avec zone, plantation courante, et 2 dernières plantations
const list = async (req, res, next) => {
  try {
    const { zone_id, season_id } = req.query;

    const where = {};
    if (zone_id) where.zoneId = zone_id;

    const beds = await prisma.bed.findMany({
      where,
      include: {
        zone: true,
        plantings: {
          orderBy: { createdAt: 'desc' },
          include: {
            cultivar: {
              include: { species: true },
            },
            season: true,
          },
        },
      },
      orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
    });

    // Séparer les plantations actives de la saison des plantations terminées
    const bedsFormates = beds.map((bed) => {
      // Toutes les plantations actives de la saison (plusieurs cultivars sur une même planche)
      const activePlantings = season_id
        ? bed.plantings.filter((p) => p.seasonId === season_id)
        : bed.plantings.filter((p) => STATUTS_ACTIFS.includes(p.status));

      // Rétro-compat : currentPlanting = la première active
      const currentPlanting = activePlantings[0] || null;

      // Les 2 dernières plantations terminées (pour contrôle de rotation)
      const recentPlantings = bed.plantings
        .filter((p) => !STATUTS_ACTIFS.includes(p.status) && (!season_id || p.seasonId !== season_id))
        .slice(0, 2);

      return {
        ...bed,
        plantings: undefined,
        activePlantings,
        currentPlanting,
        recentPlantings,
      };
    });

    res.json(bedsFormates);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'une planche avec historique complet par saison
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: {
        zone: true,
        plantings: {
          orderBy: { createdAt: 'desc' },
          include: {
            cultivar: {
              include: { species: true },
            },
            season: true,
            harvests: true,
          },
        },
      },
    });

    if (!bed) {
      return res.status(404).json({ message: 'Planche introuvable.' });
    }

    // Regrouper les plantations par saison pour l'historique
    const plantingsParSaison = bed.plantings.reduce((acc, planting) => {
      const seasonId = planting.season?.id || 'sans-saison';
      const seasonName = planting.season?.name || 'Sans saison';

      if (!acc[seasonId]) {
        acc[seasonId] = {
          season: planting.season,
          plantings: [],
        };
      }
      acc[seasonId].plantings.push(planting);
      return acc;
    }, {});

    res.json({
      ...bed,
      plantings: undefined,
      plantingHistory: Object.values(plantingsParSaison),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour les dimensions et recalcule la superficie
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { lengthM, widthM, notes } = req.body;

    // Récupérer les valeurs actuelles pour le calcul
    const existingBed = await prisma.bed.findUnique({ where: { id } });
    if (!existingBed) {
      return res.status(404).json({ message: 'Planche introuvable.' });
    }

    const data = {};
    if (notes !== undefined) data.notes = notes;

    // Recalculer la superficie si les dimensions changent
    const newLength = lengthM !== undefined ? parseFloat(lengthM) : existingBed.lengthM;
    const newWidth = widthM !== undefined ? parseFloat(widthM) : existingBed.widthM;

    if (lengthM !== undefined) data.lengthM = newLength;
    if (widthM !== undefined) data.widthM = newWidth;

    // Recalcul automatique de la superficie en m²
    if (lengthM !== undefined || widthM !== undefined) {
      data.areaM2 = parseFloat((newLength * newWidth).toFixed(2));
    }

    const bed = await prisma.bed.update({
      where: { id },
      data,
      include: { zone: true },
    });

    res.json(bed);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, update };
