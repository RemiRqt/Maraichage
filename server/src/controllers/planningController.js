// Contrôleur pour la planification assistée de cultures
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// POST /assisted — Calcule un plan de culture sans rien créer en base
const assistedPlanning = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { cultivarId, objectifKg, desiredHarvestDate } = req.body;

    // Récupérer le cultivar avec la fiche technique de son espèce
    const cultivar = await prisma.cultivar.findUnique({
      where: { id: cultivarId },
      include: {
        species: {
          include: {
            cultureSheet: {
              include: {
                transplantChart: true,
                directSowChart: true,
                yieldChart: true,
                nurseryChart: true,
                taskTemplates: true,
              },
            },
          },
        },
      },
    });

    if (!cultivar) {
      return res.status(404).json({ message: 'Cultivar introuvable.' });
    }

    const fiche = cultivar.species.cultureSheet;
    if (!fiche) {
      return res.status(404).json({
        message: `Aucune fiche technique trouvée pour l'espèce "${cultivar.species.name}". Veuillez en créer une avant de planifier.`,
      });
    }

    const tc = fiche.transplantChart;
    const dc = fiche.directSowChart;
    const yc = fiche.yieldChart;

    const objectifKgNum = parseFloat(objectifKg);
    const dateRecolte = new Date(desiredHarvestDate);

    // 1. Surface nécessaire (depuis rendement/30m → rendement/m²)
    const yieldKgPerM2 = yc?.yieldKgPer30m ? parseFloat(yc.yieldKgPer30m) / 30 : 1;
    const surfaceNecessaireM2 = objectifKgNum / yieldKgPerM2;

    // 2. Nombre de planches
    const beds = await prisma.bed.findMany({
      select: { id: true, name: true, areaM2: true },
    });
    const airesMoyenne = beds.length > 0
      ? beds.reduce((sum, b) => sum + parseFloat(b.areaM2 || 0), 0) / beds.length
      : 10;
    const nbPlanchesNecessaires = Math.ceil(surfaceNecessaireM2 / airesMoyenne);

    // 3. Nombre de plants (depuis transplantChart ou directSowChart)
    const densiteParM2 = tc?.plantsPerM2 ? parseFloat(tc.plantsPerM2) : 4;
    const nbPlants = Math.ceil(surfaceNecessaireM2 * densiteParM2);

    // 4. Semences nécessaires
    const tauxGermination = 0.8;
    const nbGraines = Math.ceil(nbPlants / tauxGermination);

    // 5. Date de semis
    const daysToMaturity = tc?.daysToMaturity || dc?.daysToMaturity || 60;
    const nurseryDays = tc?.nurseryDurationDays || 0;
    const dateSemis = new Date(dateRecolte);
    dateSemis.setDate(dateSemis.getDate() - daysToMaturity - nurseryDays);

    // 6. Heures de travail (minutes/m² × surface → heures)
    const totalMinutesPerM2 = fiche.taskTemplates.reduce(
      (sum, t) => sum + parseFloat(t.minutesPerM2 || 0), 0
    );
    const totalHeuresTravailTotal = parseFloat(
      ((totalMinutesPerM2 * surfaceNecessaireM2) / 60).toFixed(1)
    );

    const proposition = {
      cultivar: { id: cultivar.id, name: cultivar.name, species: cultivar.species },
      ficheRef: { id: fiche.id },
      objectifKg: objectifKgNum,
      dateRecolteSouhaitee: desiredHarvestDate,
      calculs: {
        surfaceNecessaireM2: parseFloat(surfaceNecessaireM2.toFixed(2)),
        nbPlanchesNecessaires,
        aireMoyennePlancheM2: parseFloat(airesMoyenne.toFixed(2)),
        nbPlantsNecessaires: nbPlants,
        nbGrainesNecessaires: nbGraines,
        dateSemisCalculee: dateSemis.toISOString().split('T')[0],
        daysToMaturity,
        nurseryDurationDays: nurseryDays,
        totalHeuresTravailEstimees: totalHeuresTravailTotal,
        yieldKgPerM2,
        densiteParM2,
      },
      planchesDisponibles: beds,
      tachesModeles: fiche.taskTemplates,
      message: `Pour atteindre ${objectifKgNum} kg de ${cultivar.name}, vous aurez besoin d'environ ${surfaceNecessaireM2.toFixed(1)} m² répartis sur ${nbPlanchesNecessaires} planche(s). Semis à prévoir le ${dateSemis.toLocaleDateString('fr-FR')}.`,
    };

    res.json(proposition);
  } catch (err) {
    next(err);
  }
};

// POST /assisted/confirm — Crée les plantations et tâches depuis un plan validé
const confirmPlanning = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      cultivarId,
      cultureSheetId,
      seasonId,
      bedIds,
      sowingDate,
      notes,
    } = req.body;

    // Récupérer la fiche avec sous-chartes et templates
    const fiche = await prisma.cultureSheet.findUnique({
      where: { id: cultureSheetId },
      include: {
        transplantChart: true,
        directSowChart: true,
        yieldChart: true,
        taskTemplates: { orderBy: { positionOrder: 'asc' } },
      },
    });

    if (!fiche) {
      return res.status(404).json({ message: 'Fiche technique introuvable.' });
    }

    const sowingDateObj = new Date(sowingDate);

    // Date de récolte prévue
    const daysToMaturity = fiche.transplantChart?.daysToMaturity
      || fiche.directSowChart?.daysToMaturity;
    let expectedHarvestDate = null;
    if (daysToMaturity) {
      expectedHarvestDate = new Date(sowingDateObj);
      expectedHarvestDate.setDate(sowingDateObj.getDate() + daysToMaturity);
    }

    // Yield par m² depuis rendement/30m
    const yieldKgPerM2 = fiche.yieldChart?.yieldKgPer30m
      ? parseFloat(fiche.yieldChart.yieldKgPer30m) / 30
      : null;

    const plantationsCreees = await prisma.$transaction(async (tx) => {
      const resultats = [];

      for (const bedId of bedIds) {
        const bed = await tx.bed.findUnique({ where: { id: bedId } });
        if (!bed) continue;

        const expectedYieldKg = yieldKgPerM2 && bed.areaM2
          ? parseFloat((yieldKgPerM2 * parseFloat(bed.areaM2)).toFixed(2))
          : null;

        const planting = await tx.planting.create({
          data: {
            seasonId,
            bedId,
            cultivarId,
            cultureSheetId,
            sowingDate: sowingDateObj,
            expectedHarvestDate,
            expectedYieldKg,
            quantityPlanted: 0,
            status: 'PLANIFIE',
            notes,
          },
          include: {
            bed: { include: { zone: true } },
            cultivar: true,
          },
        });

        // Générer les tâches avec direction AVANT/APRES
        const tachesCreees = [];
        for (const template of fiche.taskTemplates) {
          const offsetDays = template.direction === 'AVANT'
            ? -template.daysOffset
            : template.daysOffset;
          const scheduledDate = new Date(sowingDateObj);
          scheduledDate.setDate(sowingDateObj.getDate() + offsetDays);

          const tache = await tx.task.create({
            data: {
              plantingId: planting.id,
              bedId,
              taskTemplateId: template.id,
              name: template.name,
              description: template.description,
              scheduledDate,
              priority: 'NORMALE',
              status: 'A_FAIRE',
            },
          });
          tachesCreees.push(tache);
        }

        resultats.push({ planting, tasksCreated: tachesCreees.length });
      }

      return resultats;
    });

    res.status(201).json({
      message: `${plantationsCreees.length} plantation(s) créée(s) avec leurs tâches associées.`,
      plantations: plantationsCreees,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { assistedPlanning, confirmPlanning };
