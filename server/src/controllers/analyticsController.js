// Contrôleur pour les analyses et statistiques maraîchères
const prisma = require('../utils/prisma');

// Convertit un champ Prisma Decimal (ou null) en nombre JS
const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return parseFloat(String(v)) || 0;
};

// Utilitaire : calcule le résumé complet d'une saison
async function calculerResumeSaison(seasonId) {
  // Récupérer toutes les récoltes de la saison
  const recoltes = await prisma.harvest.findMany({
    where: { planting: { seasonId } },
    include: {
      planting: {
        include: {
          cultivar: { include: { species: true } },
        },
      },
    },
  });

  // Récupérer toutes les tâches de la saison
  const taches = await prisma.task.findMany({
    where: { planting: { seasonId } },
    select: {
      status: true,
      actualDurationHours: true,
    },
  });

  // Récupérer toutes les plantations de la saison
  const plantations = await prisma.planting.findMany({
    where: { seasonId },
    select: {
      status: true,
      expectedYieldKg: true,
      cultivarId: true,
      cultivar: { select: { name: true } },
    },
  });

  // Calculer le total de kg récoltés (quantityKg est un Decimal Prisma → convertir en number)
  const totalKgRecoltes = recoltes.reduce((sum, h) => sum + toNum(h.quantityKg), 0);

  // Calculer le total d'heures travaillées
  const totalHeuresTravaillees = taches
    .filter((t) => t.status === 'FAIT')
    .reduce((sum, t) => sum + toNum(t.actualDurationHours), 0);

  // Nombre de plantations par statut
  const plantationsParStatut = plantations.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  // Top 5 cultivars par rendement
  const rendementParCultivar = recoltes.reduce((acc, h) => {
    const cultivarId = h.planting?.cultivarId;
    const nom = h.planting?.cultivar?.name || 'Inconnu';
    if (!cultivarId) return acc;
    if (!acc[cultivarId]) acc[cultivarId] = { nom, totalKg: 0 };
    acc[cultivarId].totalKg += toNum(h.quantityKg);
    return acc;
  }, {});

  const top5Cultivars = Object.entries(rendementParCultivar)
    .map(([id, data]) => ({ cultivarId: id, ...data }))
    .sort((a, b) => b.totalKg - a.totalKg)
    .slice(0, 5);

  return {
    totalKgRecoltes: parseFloat(totalKgRecoltes.toFixed(2)),
    totalHeuresTravaillees: parseFloat(totalHeuresTravaillees.toFixed(1)),
    nombrePlantations: plantations.length,
    plantationsParStatut,
    top5CultivarsParRendement: top5Cultivars,
  };
}

// GET /cultures — Analyse par cultivar pour une saison
const cultures = async (req, res, next) => {
  try {
    const { season_id } = req.query;

    // Récupérer le taux horaire depuis les paramètres de l'app
    const tauxHoraireSetting = await prisma.appSetting.findFirst({
      where: { key: 'hourlyRate' },
    });
    const tauxHoraire = tauxHoraireSetting ? parseFloat(tauxHoraireSetting.value) : null;

    const where = {};
    if (season_id) where.seasonId = season_id;

    const plantations = await prisma.planting.findMany({
      where,
      include: {
        cultivar: { include: { species: true } },
        harvests: true,
        tasks: {
          where: { status: 'FAIT' },
          select: { actualDurationHours: true },
        },
      },
    });

    const analyseParCultivar = {};

    for (const planting of plantations) {
      const cultivarId = planting.cultivarId;

      if (!analyseParCultivar[cultivarId]) {
        analyseParCultivar[cultivarId] = {
          cultivar: planting.cultivar,
          totalKgRecoltes: 0,
          totalKgPrevus: 0,
          totalHeuresTravaillees: 0,
          coutEstimeEuros: null,
          nombrePlantations: 0,
        };
      }

      const entry = analyseParCultivar[cultivarId];

      // Somme des récoltes réelles (Decimal → number)
      const kgRecoltes = planting.harvests.reduce((sum, h) => sum + toNum(h.quantityKg), 0);
      entry.totalKgRecoltes += kgRecoltes;

      // Somme des rendements prévus (Decimal → number)
      entry.totalKgPrevus += toNum(planting.expectedYieldKg);

      // Somme des heures de tâches réalisées
      const heures = planting.tasks.reduce(
        (sum, t) => sum + toNum(t.actualDurationHours),
        0
      );
      entry.totalHeuresTravaillees += heures;
      entry.nombrePlantations += 1;

      // Calcul du coût si le taux horaire est défini
      if (tauxHoraire) {
        entry.coutEstimeEuros = parseFloat(
          (entry.totalHeuresTravaillees * tauxHoraire).toFixed(2)
        );
      }
    }

    const result = Object.values(analyseParCultivar)
      .map((e) => ({
        ...e,
        totalKgRecoltes: parseFloat(e.totalKgRecoltes.toFixed(2)),
        totalKgPrevus: parseFloat(e.totalKgPrevus.toFixed(2)),
        totalHeuresTravaillees: parseFloat(e.totalHeuresTravaillees.toFixed(1)),
        tauxRendementPct:
          e.totalKgPrevus > 0
            ? parseFloat(((e.totalKgRecoltes / e.totalKgPrevus) * 100).toFixed(1))
            : null,
      }))
      .sort((a, b) => b.totalKgRecoltes - a.totalKgRecoltes);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /beds — Analyse par planche pour une saison
const beds = async (req, res, next) => {
  try {
    const { season_id } = req.query;

    const where = {};
    if (season_id) where.seasonId = season_id;

    // Récupérer la saison pour calculer le nombre total de jours
    let saisonDureeJours = 365;
    if (season_id) {
      const saison = await prisma.season.findUnique({ where: { id: season_id } });
      if (saison?.startDate && saison?.endDate) {
        const diffMs = new Date(saison.endDate) - new Date(saison.startDate);
        saisonDureeJours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    const plantations = await prisma.planting.findMany({
      where,
      include: {
        bed: { include: { zone: true } },
        harvests: { select: { quantityKg: true } },
      },
    });

    const analyseParPlanche = {};

    for (const planting of plantations) {
      const bedId = planting.bedId;

      if (!analyseParPlanche[bedId]) {
        analyseParPlanche[bedId] = {
          bed: planting.bed,
          totalKgRecoltes: 0,
          joursOccupes: 0,
          nombrePlantations: 0,
        };
      }

      const entry = analyseParPlanche[bedId];

      // Somme des récoltes (Decimal → number)
      const kg = planting.harvests.reduce((sum, h) => sum + toNum(h.quantityKg), 0);
      entry.totalKgRecoltes += kg;
      entry.nombrePlantations += 1;

      // Calcul des jours d'occupation (entre la date de semis et la date de fin ou aujourd'hui)
      if (planting.sowingDate) {
        const debut = new Date(planting.sowingDate);
        const fin = planting.actualFirstHarvestDate
          ? new Date(planting.actualFirstHarvestDate)
          : new Date();
        const jours = Math.max(0, Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)));
        entry.joursOccupes += jours;
      }
    }

    const result = Object.values(analyseParPlanche).map((e) => {
      const aireM2 = toNum(e.bed?.areaM2) || 1;
      return {
        ...e,
        totalKgRecoltes: parseFloat(e.totalKgRecoltes.toFixed(2)),
        kgParM2: parseFloat((e.totalKgRecoltes / aireM2).toFixed(2)),
        occupationPct: parseFloat(
          (Math.min(e.joursOccupes, saisonDureeJours) / saisonDureeJours * 100).toFixed(1)
        ),
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /season-summary — Résumé complet d'une saison
const seasonSummary = async (req, res, next) => {
  try {
    const { season_id } = req.query;

    if (!season_id) {
      return res.status(400).json({ message: "L'identifiant de la saison est requis." });
    }

    const saison = await prisma.season.findUnique({ where: { id: season_id } });
    if (!saison) {
      return res.status(404).json({ message: 'Saison introuvable.' });
    }

    const resume = await calculerResumeSaison(season_id);

    res.json({ saison, ...resume });
  } catch (err) {
    next(err);
  }
};

// GET /compare — Comparaison côte à côte de deux saisons
const compare = async (req, res, next) => {
  try {
    const { season_a, season_b } = req.query;

    if (!season_a || !season_b) {
      return res.status(400).json({ message: 'Les identifiants des deux saisons sont requis.' });
    }

    const [saisonA, saisonB] = await Promise.all([
      prisma.season.findUnique({ where: { id: season_a } }),
      prisma.season.findUnique({ where: { id: season_b } }),
    ]);

    if (!saisonA) return res.status(404).json({ message: 'Saison A introuvable.' });
    if (!saisonB) return res.status(404).json({ message: 'Saison B introuvable.' });

    const [resumeA, resumeB] = await Promise.all([
      calculerResumeSaison(season_a),
      calculerResumeSaison(season_b),
    ]);

    res.json({
      saisonA: { ...saisonA, ...resumeA },
      saisonB: { ...saisonB, ...resumeB },
    });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard — Tableau de bord avec les données clés du moment
const dashboard = async (req, res, next) => {
  try {
    const { season_id } = req.query;
    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);

    const demain = new Date(aujourd_hui);
    demain.setDate(demain.getDate() + 1);

    // Filtre saison : tâches liées à la saison OU tâches libres (sans plantation)
    const seasonFilter = season_id
      ? { OR: [{ planting: { seasonId: season_id } }, { plantingId: null }] }
      : {};

    // Tâches du jour à faire
    const tachesAujourdhui = await prisma.task.findMany({
      where: {
        status: 'A_FAIRE',
        scheduledDate: { gte: aujourd_hui, lt: demain },
        ...seasonFilter,
      },
      include: {
        bed: { include: { zone: true } },
        planting: { include: { cultivar: true } },
      },
      orderBy: { priority: 'desc' },
    });

    // Tâches en retard (A_FAIRE + date passée)
    const tachesEnRetard = await prisma.task.findMany({
      where: {
        status: 'A_FAIRE',
        scheduledDate: { lt: aujourd_hui },
        ...seasonFilter,
      },
      include: {
        bed: { include: { zone: true } },
        planting: { include: { cultivar: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Plantations prêtes à récolter (date de récolte prévue atteinte, statut actif)
    const pretesARecolter = await prisma.planting.findMany({
      where: {
        expectedHarvestDate: { lte: new Date() },
        status: { notIn: ['TERMINE', 'ECHEC', 'ABANDONNE'] },
        ...(season_id ? { seasonId: season_id } : {}),
      },
      include: {
        bed: { include: { zone: true } },
        cultivar: { include: { species: true } },
        season: true,
      },
      orderBy: { expectedHarvestDate: 'asc' },
    });

    // Lots de pépinière prêts à repiquer
    const pepinierePreteARepiquer = await prisma.nurseryBatch.findMany({
      where: {
        expectedTransplantDate: { lte: new Date() },
        status: 'PRET_AU_REPIQUAGE',
      },
      include: {
        cultivar: true,
        planting: { include: { bed: true } },
      },
      orderBy: { expectedTransplantDate: 'asc' },
    });

    res.json({
      date: aujourd_hui.toISOString().split('T')[0],
      tachesAujourdhui,
      tachesEnRetard,
      pretesARecolter,
      pepinierePreteARepiquer,
      stats: {
        nbTachesAujourdhui: tachesAujourdhui.length,
        nbTachesEnRetard: tachesEnRetard.length,
        nbPretesARecolter: pretesARecolter.length,
        nbPepinierePreteARepiquer: pepinierePreteARepiquer.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { cultures, beds, seasonSummary, compare, dashboard };
