// Contrôleur pour la gestion des tâches agricoles
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les tâches avec tous les filtres supportés
const list = async (req, res, next) => {
  try {
    const {
      date,
      status,
      bed_id,
      zone_id,
      planting_id,
      priority,
      date_from,
      date_to,
      season_id,
    } = req.query;

    const where = {};

    // Filtre par statut
    if (status) where.status = status;

    // Filtre par priorité
    if (priority) where.priority = priority;

    // Filtre par plantation
    if (planting_id) where.plantingId = planting_id;

    // Filtre par planche
    if (bed_id) where.bedId = bed_id;

    // Filtre par zone (via la relation planche -> zone)
    if (zone_id) {
      where.bed = { zoneId: zone_id };
    }

    // Filtre par saison (via la relation plantation -> saison)
    if (season_id) {
      where.planting = { seasonId: season_id };
    }

    // Filtre par date exacte
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.scheduledDate = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    // Filtre par plage de dates
    if (date_from || date_to) {
      where.scheduledDate = {};
      if (date_from) where.scheduledDate.gte = new Date(date_from);
      if (date_to) where.scheduledDate.lte = new Date(date_to);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        planting: {
          include: {
            cultivar: { include: { species: true } },
          },
        },
        bed: { include: { zone: true } },
        taskTemplate: true,
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { priority: 'desc' },
      ],
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une tâche libre
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      name,
      description,
      scheduledDate,
      plantingId,
      bedId,
      priority,
    } = req.body;

    const task = await prisma.task.create({
      data: {
        name,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        plantingId: plantingId || null,
        bedId: bedId || null,
        priority: priority || 'NORMALE',
        status: 'A_FAIRE',
      },
      include: {
        planting: { include: { cultivar: true } },
        bed: { include: { zone: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une tâche (permet de changer la date planifiée)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      scheduledDate,
      priority,
      status,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (scheduledDate !== undefined) data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        planting: { include: { cultivar: true } },
        bed: { include: { zone: true } },
      },
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/complete — Marque une tâche comme effectuée
// Si la tâche est liée à un template de type semis/transplantation/récolte,
// met à jour les dates correspondantes sur la plantation
const complete = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;
    const { actualDurationHours } = req.body;
    const now = new Date();

    const data = {
      status: 'FAIT',
      completedDate: now,
    };

    if (actualDurationHours !== undefined) {
      data.actualDurationHours = parseFloat(actualDurationHours);
    }

    // Récupérer la tâche avec son template et sa plantation
    const existing = await prisma.task.findUnique({
      where: { id },
      include: {
        taskTemplate: true,
        planting: {
          include: {
            cultureSheet: { include: { transplantChart: true, directSowChart: true } },
          },
        },
      },
    });

    if (!existing) return res.status(404).json({ message: 'Tâche introuvable' });

    const task = await prisma.task.update({ where: { id }, data });

    // Impacter la plantation si la tâche est liée à un template connu
    if (existing.plantingId && existing.taskTemplate) {
      const templateName = (existing.taskTemplate.templateName || existing.taskTemplate.name || '').toLowerCase().trim();
      const plantingUpdate = {};

      if (templateName.includes('semis') && templateName.includes('pépi')) {
        // Semis pépinière → met à jour sowingDate + recalcule dates en cascade
        plantingUpdate.sowingDate = now;
        plantingUpdate.status = 'SEME';

        // Recalculer transplantDate si nurseryDurationDays dispo
        const nurseryDays = existing.planting?.cultureSheet?.transplantChart?.nurseryDurationDays;
        if (nurseryDays) {
          const transplantDate = new Date(now);
          transplantDate.setDate(transplantDate.getDate() + nurseryDays);
          plantingUpdate.transplantDate = transplantDate;

          // Recalculer expectedHarvestDate
          const daysToMaturity = existing.planting?.cultureSheet?.transplantChart?.daysToMaturity
            || existing.planting?.cultureSheet?.directSowChart?.daysToMaturity;
          if (daysToMaturity) {
            const harvestDate = new Date(now);
            harvestDate.setDate(harvestDate.getDate() + nurseryDays + daysToMaturity);
            plantingUpdate.expectedHarvestDate = harvestDate;
          }
        }
      } else if (templateName.includes('semis direct')) {
        // Semis direct → met à jour sowingDate + recalcule récolte
        plantingUpdate.sowingDate = now;
        plantingUpdate.status = 'SEME';

        const daysToMaturity = existing.planting?.cultureSheet?.directSowChart?.daysToMaturity
          || existing.planting?.cultureSheet?.transplantChart?.daysToMaturity;
        if (daysToMaturity) {
          const harvestDate = new Date(now);
          harvestDate.setDate(harvestDate.getDate() + daysToMaturity);
          plantingUpdate.expectedHarvestDate = harvestDate;
        }
      } else if (templateName.includes('transplant')) {
        // Transplantation → met à jour transplantDate
        plantingUpdate.transplantDate = now;
        plantingUpdate.status = 'TRANSPLANTE';

        // Recalculer expectedHarvestDate depuis transplantDate
        const daysToMaturity = existing.planting?.cultureSheet?.transplantChart?.daysToMaturity;
        if (daysToMaturity) {
          const harvestDate = new Date(now);
          harvestDate.setDate(harvestDate.getDate() + daysToMaturity);
          plantingUpdate.expectedHarvestDate = harvestDate;
        }
      } else if (templateName.includes('récolte') || templateName.includes('recolte')) {
        // 1ère Récolte → met à jour actualFirstHarvestDate + statut
        plantingUpdate.actualFirstHarvestDate = now;
        plantingUpdate.status = 'EN_RECOLTE';
      }

      if (Object.keys(plantingUpdate).length > 0) {
        await prisma.planting.update({
          where: { id: existing.plantingId },
          data: plantingUpdate,
        });

        // Recalculer les dates des tâches restantes (A_FAIRE) de cette plantation
        const siblingTasks = await prisma.task.findMany({
          where: { plantingId: existing.plantingId, status: 'A_FAIRE', id: { not: id } },
          include: { taskTemplate: true },
        });

        for (const sibling of siblingTasks) {
          if (!sibling.taskTemplate) continue;
          const sibName = (sibling.taskTemplate.templateName || sibling.taskTemplate.name || '').toLowerCase().trim();
          let newDate = null;

          if (sibName.includes('transplant')) {
            // Transplantation → prend la nouvelle transplantDate
            newDate = plantingUpdate.transplantDate || null;
          } else if (sibName.includes('récolte') || sibName.includes('recolte')) {
            // 1ère Récolte → prend la nouvelle expectedHarvestDate
            newDate = plantingUpdate.expectedHarvestDate || null;
          } else {
            // Autres tâches : recalculer l'offset depuis la nouvelle sowingDate
            const base = plantingUpdate.sowingDate || existing.planting.sowingDate;
            const offsetDays = sibling.taskTemplate.direction === 'AVANT'
              ? -sibling.taskTemplate.daysOffset
              : sibling.taskTemplate.daysOffset;
            newDate = new Date(base);
            newDate.setDate(newDate.getDate() + offsetDays);
          }

          if (newDate) {
            await prisma.task.update({
              where: { id: sibling.id },
              data: { scheduledDate: newDate },
            });
          }
        }
      }
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/uncomplete — Annule la validation d'une tâche
const uncomplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Tâche introuvable' });
    if (existing.status !== 'FAIT') return res.status(400).json({ message: 'La tâche n\'est pas terminée' });

    const task = await prisma.task.update({
      where: { id },
      data: { status: 'A_FAIRE', completedDate: null, actualDurationHours: null },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une tâche
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, complete, uncomplete, remove };
