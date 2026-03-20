// Contrôleur pour le calendrier agricole
const prisma = require('../utils/prisma');

// GET /events — Agrège les événements du mois en cours
const events = async (req, res, next) => {
  try {
    const { season_id, year, month } = req.query;

    // Période du mois demandé (ou mois courant par défaut)
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const dateFrom = new Date(y, m - 1, 1);
    const dateTo = new Date(y, m, 0, 23, 59, 59); // dernier jour du mois

    const seasonFilter = season_id ? { seasonId: season_id } : {};

    // Récupérer les plantations du mois avec leurs dates clés
    const plantings = await prisma.planting.findMany({
      where: {
        ...seasonFilter,
        OR: [
          { sowingDate: { gte: dateFrom, lte: dateTo } },
          { transplantDate: { gte: dateFrom, lte: dateTo } },
          { expectedHarvestDate: { gte: dateFrom, lte: dateTo } },
        ],
      },
      include: {
        cultivar: true,
        bed: true,
      },
    });

    // Récupérer les tâches du mois
    const tasks = await prisma.task.findMany({
      where: {
        scheduledDate: { gte: dateFrom, lte: dateTo },
        ...(season_id ? { OR: [{ planting: { seasonId: season_id } }, { plantingId: null }] } : {}),
      },
      include: {
        planting: { include: { cultivar: true } },
        bed: true,
      },
    });

    const calendarEvents = [];

    // Transformer les plantations en événements
    for (const p of plantings) {
      const label = p.cultivar?.name || 'Culture';
      const detail = p.bed?.name;

      if (p.sowingDate && p.sowingDate >= dateFrom && p.sowingDate <= dateTo) {
        calendarEvents.push({
          date: p.sowingDate.toISOString().split('T')[0],
          type: 'SEMIS',
          label,
          detail,
          plantingId: p.id,
        });
      }

      if (p.transplantDate && p.transplantDate >= dateFrom && p.transplantDate <= dateTo) {
        calendarEvents.push({
          date: p.transplantDate.toISOString().split('T')[0],
          type: 'TRANSPLANTATION',
          label,
          detail,
          plantingId: p.id,
        });
      }

      if (p.expectedHarvestDate && p.expectedHarvestDate >= dateFrom && p.expectedHarvestDate <= dateTo) {
        calendarEvents.push({
          date: p.expectedHarvestDate.toISOString().split('T')[0],
          type: 'RECOLTE',
          label,
          detail,
          plantingId: p.id,
        });
      }
    }

    // Transformer les tâches en événements
    for (const t of tasks) {
      if (t.scheduledDate) {
        calendarEvents.push({
          date: t.scheduledDate.toISOString().split('T')[0],
          type: 'TACHE',
          label: t.name,
          detail: t.planting?.cultivar?.name || t.bed?.name,
          taskId: t.id,
          status: t.status,
        });
      }
    }

    // Trier par date
    calendarEvents.sort((a, b) => a.date.localeCompare(b.date));

    res.json(calendarEvents);
  } catch (err) {
    next(err);
  }
};

module.exports = { events };
