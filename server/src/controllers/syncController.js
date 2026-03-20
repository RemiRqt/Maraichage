// Contrôleur pour la synchronisation hors-ligne (offline-first)
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// Modèles Prisma supportés pour la synchronisation
const MODELES_SYNC = {
  task: prisma.task,
  harvest: prisma.harvest,
  journalEntry: prisma.journalEntry,
  nurseryBatch: prisma.nurseryBatch,
};

// POST /push — Applique les modifications hors-ligne avec stratégie "last write wins"
const push = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { changes } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.json({
        message: 'Aucune modification à synchroniser.',
        applied: 0,
        skipped: 0,
        errors: [],
      });
    }

    const resultats = {
      applied: 0,
      skipped: 0,
      errors: [],
    };

    // Traiter chaque modification
    for (const change of changes) {
      const { model, id, data, updatedAt: clientUpdatedAt, operation } = change;

      // Vérifier que le modèle est supporté
      const prismaModel = MODELES_SYNC[model];
      if (!prismaModel) {
        resultats.errors.push({
          id,
          model,
          raison: `Modèle '${model}' non supporté pour la synchronisation.`,
        });
        continue;
      }

      try {
        if (operation === 'delete') {
          // Suppression
          try {
            await prismaModel.delete({ where: { id } });
            resultats.applied++;
          } catch {
            // L'enregistrement n'existe peut-être plus, ignorer
            resultats.skipped++;
          }
          continue;
        }

        // Création ou mise à jour avec stratégie "last write wins"
        const existingRecord = await prismaModel.findUnique({
          where: { id },
          select: { updatedAt: true },
        });

        if (existingRecord) {
          // Vérification du timestamp : conserver la version la plus récente
          const serverUpdatedAt = existingRecord.updatedAt;
          const clientDate = clientUpdatedAt ? new Date(clientUpdatedAt) : new Date(0);

          if (clientDate < serverUpdatedAt) {
            // La version serveur est plus récente : ignorer la modification client
            resultats.skipped++;
            continue;
          }

          // La version cliente est plus récente : appliquer les modifications
          await prismaModel.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
          });
          resultats.applied++;
        } else {
          // L'enregistrement n'existe pas : le créer
          await prismaModel.create({
            data: { id, ...data },
          });
          resultats.applied++;
        }
      } catch (err) {
        resultats.errors.push({
          id,
          model,
          raison: err.message,
        });
      }
    }

    res.json({
      message: `Synchronisation terminée : ${resultats.applied} appliqué(s), ${resultats.skipped} ignoré(s), ${resultats.errors.length} erreur(s).`,
      ...resultats,
    });
  } catch (err) {
    next(err);
  }
};

// GET /pull — Retourne tous les enregistrements modifiés depuis la dernière synchronisation
const pull = async (req, res, next) => {
  try {
    const { last_sync } = req.query;

    // Si pas de date, retourner les 7 derniers jours
    const since = last_sync
      ? new Date(last_sync)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Requêtes parallèles pour chaque modèle synchronisable
    const [taches, recoltes, entresJournal, lotsPepiniere] = await Promise.all([
      prisma.task.findMany({
        where: { updatedAt: { gte: since } },
        include: {
          planting: { select: { cultivarId: true, seasonId: true } },
        },
      }),
      prisma.harvest.findMany({
        where: { updatedAt: { gte: since } },
      }),
      prisma.journalEntry.findMany({
        where: {
          updatedAt: { gte: since },
          userId: req.user.id, // Limiter aux entrées de l'utilisateur connecté
        },
      }),
      prisma.nurseryBatch.findMany({
        where: { updatedAt: { gte: since } },
      }),
    ]);

    res.json({
      syncedAt: new Date().toISOString(),
      since: since.toISOString(),
      data: {
        tasks: taches,
        harvests: recoltes,
        journalEntries: entresJournal,
        nurseryBatches: lotsPepiniere,
      },
      counts: {
        tasks: taches.length,
        harvests: recoltes.length,
        journalEntries: entresJournal.length,
        nurseryBatches: lotsPepiniere.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { push, pull };
