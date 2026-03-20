// ============================================================
// Import des fiches techniques depuis les CSV Airtable
// Usage: node prisma/seedCultureSheets.js
// ============================================================

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_DIR = path.join(__dirname, '..', '..', 'csv');

// --- Utilitaires CSV ---

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parser les en-têtes
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDecFr(val) {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : n;
}

function parseIntSafe(val) {
  if (!val) return null;
  const n = parseInt(val.replace(/[^\d\-]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parsePriceFr(val) {
  if (!val) return null;
  const n = parseFloat(val.replace('€', '').replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) || !isFinite(n) ? null : n;
}

function parseRevenueFr(val) {
  if (!val) return null;
  // Format: €2700.00 or €2 700,00
  const n = parseFloat(val.replace('€', '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) || !isFinite(n) ? null : n;
}

// --- Trouver ou créer une espèce + fiche technique ---

const speciesCache = new Map();
const sheetCache = new Map();

async function getOrCreateSpecies(name) {
  if (!name) return null;
  const key = name.trim();
  if (speciesCache.has(key)) return speciesCache.get(key);

  let species = await prisma.species.findUnique({ where: { name: key } });
  if (!species) {
    species = await prisma.species.create({
      data: { name: key, family: 'À déterminer', category: 'LEGUME' },
    });
    console.log(`  + Espèce créée : ${key}`);
  }
  speciesCache.set(key, species);
  return species;
}

async function getOrCreateSheet(speciesId) {
  if (sheetCache.has(speciesId)) return sheetCache.get(speciesId);

  let sheet = await prisma.cultureSheet.findUnique({ where: { speciesId } });
  if (!sheet) {
    sheet = await prisma.cultureSheet.create({
      data: { speciesId, updatedAt: new Date() },
    });
  }
  sheetCache.set(speciesId, sheet);
  return sheet;
}

// --- Importeurs par type ---

async function importNurseryChart() {
  console.log('\n📋 Import Pépinière...');
  const rows = parseCSV(path.join(CSV_DIR, 'Charte pépinière-Grid view.csv'));
  let count = 0;

  for (const row of rows) {
    const speciesName = row['Espèce'] || row['Nom'];
    if (!speciesName) continue;

    const species = await getOrCreateSpecies(speciesName);
    const sheet = await getOrCreateSheet(species.id);

    const containerType = row['Contenant'] || 'Plateau 128 cellules';
    const seedsPerCell = parseIntSafe(row['Semance / cell']) || 1;
    const technique = row['Technique'] || null;
    const germinationDays = parseIntSafe(row['j germination']) || 0;
    const germinationTempC = parseIntSafe(row['Température germination optimale']);

    const nursery = await prisma.nurseryChart.upsert({
      where: { cultureSheetId: sheet.id },
      update: { containerType, seedsPerCell, technique, germinationDays, germinationTempC },
      create: {
        cultureSheetId: sheet.id,
        containerType,
        seedsPerCell,
        technique,
        germinationDays,
        germinationTempC,
        updatedAt: new Date(),
      },
    });

    // Rempotages (jusqu'à 3)
    const repots = [];
    if (row['contenant rempotage']) {
      repots.push({
        stageNumber: 1,
        containerType: row['contenant rempotage'],
        daysAfterSowing: parseIntSafe(row['J jusqu\'au rempotage']) || germinationDays,
      });
    }
    if (row['2eme contenant rempotage']) {
      repots.push({
        stageNumber: 2,
        containerType: row['2eme contenant rempotage'],
        daysAfterSowing: parseIntSafe(row['j jusqu\'au 2eme rempotage']) || 0,
      });
    }
    if (row['3eme contenant rempotage']) {
      repots.push({
        stageNumber: 3,
        containerType: row['3eme contenant rempotage'],
        daysAfterSowing: parseIntSafe(row['J jusqu\'au 3e rempotage']) || 0,
      });
    }

    // Supprimer les anciens stades et recréer
    await prisma.nurseryRepotStage.deleteMany({ where: { nurseryChartId: nursery.id } });
    for (const r of repots) {
      if (r.containerType) {
        await prisma.nurseryRepotStage.create({
          data: { nurseryChartId: nursery.id, ...r },
        });
      }
    }
    count++;
  }
  console.log(`  ✓ ${count} fiches pépinière importées`);
}

async function importTransplantChart() {
  console.log('\n📋 Import Transplants...');
  const rows = parseCSV(path.join(CSV_DIR, 'Charte transplants-Grid view.csv'));
  let count = 0;

  for (const row of rows) {
    const speciesName = row['Espèces'] || row['Nom'];
    if (!speciesName) continue;

    const species = await getOrCreateSpecies(speciesName);
    const sheet = await getOrCreateSheet(species.id);

    await prisma.transplantChart.upsert({
      where: { cultureSheetId: sheet.id },
      update: {
        rowCount: parseIntSafe(row['Nb rang']) || 1,
        rowSpacingCm: parseDecFr(row['Espacement entre rg (cm)']) || 0,
        plantSpacingCm: parseDecFr(row['Espacement sur rg (cm)']) || 0,
        nurseryDurationDays: parseIntSafe(row['Jours en pépinière (j)']),
        daysToMaturity: parseIntSafe(row['JAM (j)']) || 0,
        harvestWindowDays: parseIntSafe(row['Récolte (j)']) || 0,
        sowWeekStart: parseIntSafe(row['Sem début']),
        sowWeekEnd: parseIntSafe(row['Sem Fin']),
        safetyMarginPct: parseIntSafe(row['Marge de sécurité en %']),
        plantsPerM2: parseDecFr(row['nb transplant /m2']),
        plantsPerM2WithMargin: parseDecFr(row['nb transplant m2 + marge 20%']),
      },
      create: {
        cultureSheetId: sheet.id,
        rowCount: parseIntSafe(row['Nb rang']) || 1,
        rowSpacingCm: parseDecFr(row['Espacement entre rg (cm)']) || 0,
        plantSpacingCm: parseDecFr(row['Espacement sur rg (cm)']) || 0,
        nurseryDurationDays: parseIntSafe(row['Jours en pépinière (j)']),
        daysToMaturity: parseIntSafe(row['JAM (j)']) || 0,
        harvestWindowDays: parseIntSafe(row['Récolte (j)']) || 0,
        sowWeekStart: parseIntSafe(row['Sem début']),
        sowWeekEnd: parseIntSafe(row['Sem Fin']),
        safetyMarginPct: parseIntSafe(row['Marge de sécurité en %']),
        plantsPerM2: parseDecFr(row['nb transplant /m2']),
        plantsPerM2WithMargin: parseDecFr(row['nb transplant m2 + marge 20%']),
        updatedAt: new Date(),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} fiches transplant importées`);
}

async function importDirectSowChart() {
  console.log('\n📋 Import Semis directs...');
  const rows = parseCSV(path.join(CSV_DIR, 'Charte semis directs-Grid view.csv'));
  let count = 0;

  for (const row of rows) {
    const speciesName = row['Espèce'] || row['Nom cultivar'];
    if (!speciesName) continue;

    const species = await getOrCreateSpecies(speciesName);
    const sheet = await getOrCreateSheet(species.id);

    const marginStr = (row['Marge de sécu %'] || '').replace('%', '');

    await prisma.directSowChart.upsert({
      where: { cultureSheetId: sheet.id },
      update: {
        rowCount: parseIntSafe(row['nb rangs']) || 1,
        rowSpacingCm: parseDecFr(row['Espacement rg (cm)']) || 0,
        daysToMaturity: parseIntSafe(row['JAM (j)']) || 0,
        harvestWindowDays: parseIntSafe(row['Recolte (j)']) || 0,
        safetyMarginPct: parseIntSafe(marginStr),
        sowWeekStart: parseIntSafe(row['sem possible début']),
        sowWeekEnd: parseIntSafe(row['sem possible fin']),
      },
      create: {
        cultureSheetId: sheet.id,
        rowCount: parseIntSafe(row['nb rangs']) || 1,
        rowSpacingCm: parseDecFr(row['Espacement rg (cm)']) || 0,
        daysToMaturity: parseIntSafe(row['JAM (j)']) || 0,
        harvestWindowDays: parseIntSafe(row['Recolte (j)']) || 0,
        safetyMarginPct: parseIntSafe(marginStr),
        sowWeekStart: parseIntSafe(row['sem possible début']),
        sowWeekEnd: parseIntSafe(row['sem possible fin']),
        updatedAt: new Date(),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} fiches semis direct importées`);
}

async function importYieldChart() {
  console.log('\n📋 Import Rendements...');
  const rows = parseCSV(path.join(CSV_DIR, 'Charte des rendements-Grid view.csv'));
  let count = 0;

  for (const row of rows) {
    const speciesName = row['Espèces'] || row['Charte des rendements'];
    if (!speciesName) continue;

    const species = await getOrCreateSpecies(speciesName);
    const sheet = await getOrCreateSheet(species.id);

    const revenuePerDayPerM = parseDecFr(row['Rendement en € par J et par Mètre']);
    const yieldKgPerDayPerM = parseDecFr(row['Rendement en KG par J et par Mètre']);

    await prisma.yieldChart.upsert({
      where: { cultureSheetId: sheet.id },
      update: {
        saleUnit: row['Unite'] || 'Kilogramme',
        weightPerUnitG: parseDecFr(row['Poids (en g)']),
        pricePerUnit: parsePriceFr(row['Prix €/U']),
        yieldQtyPer30m: parseDecFr(row['Rendement Q/30m']),
        yieldKgPer30m: parseDecFr(row['Rendement KG/30m']),
        revenuePer30m: parseRevenueFr(row['Revenu €/30m']),
        harvestDays: parseIntSafe(row['Jours de récolte (from Espèces)']),
        revenuePerDayPerM: (revenuePerDayPerM && isFinite(revenuePerDayPerM)) ? revenuePerDayPerM : null,
        yieldKgPerDayPerM: (yieldKgPerDayPerM && isFinite(yieldKgPerDayPerM)) ? yieldKgPerDayPerM : null,
        harvestsPerWeek: parseDecFr(row['Récolte hebdomadaire']),
      },
      create: {
        cultureSheetId: sheet.id,
        saleUnit: row['Unite'] || 'Kilogramme',
        weightPerUnitG: parseDecFr(row['Poids (en g)']),
        pricePerUnit: parsePriceFr(row['Prix €/U']),
        yieldQtyPer30m: parseDecFr(row['Rendement Q/30m']),
        yieldKgPer30m: parseDecFr(row['Rendement KG/30m']),
        revenuePer30m: parseRevenueFr(row['Revenu €/30m']),
        harvestDays: parseIntSafe(row['Jours de récolte (from Espèces)']),
        revenuePerDayPerM: (revenuePerDayPerM && isFinite(revenuePerDayPerM)) ? revenuePerDayPerM : null,
        yieldKgPerDayPerM: (yieldKgPerDayPerM && isFinite(yieldKgPerDayPerM)) ? yieldKgPerDayPerM : null,
        harvestsPerWeek: parseDecFr(row['Récolte hebdomadaire']),
        updatedAt: new Date(),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} fiches rendement importées`);
}

async function importTaskTemplates() {
  console.log('\n📋 Import Tâches...');
  const rows = parseCSV(path.join(CSV_DIR, 'Charte taches-Nocode.csv'));
  let count = 0;

  for (const row of rows) {
    const speciesName = row['Espèces'];
    const taskName = row['Nom tache'];
    if (!speciesName || !taskName) continue;

    const species = await getOrCreateSpecies(speciesName);
    const sheet = await getOrCreateSheet(species.id);

    const directionRaw = (row['Avant / Après'] || '').toLowerCase().trim();
    const direction = directionRaw === 'avant' ? 'AVANT' : 'APRES';
    const daysOffset = parseIntSafe(row['nb J']) || 0;
    const minutesPerM2 = parseDecFr(row['min par m2']);
    const templateName = (row['tache template'] || '').trim() || null;

    await prisma.taskTemplate.create({
      data: {
        cultureSheetId: sheet.id,
        name: taskName,
        templateName,
        direction,
        daysOffset,
        minutesPerM2,
        updatedAt: new Date(),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} templates de tâches importés`);
}

// --- Calcul du sowingMethod ---

async function updateSowingMethods() {
  console.log('\n📋 Calcul des méthodes de semis...');
  const sheets = await prisma.cultureSheet.findMany({
    include: { nurseryChart: true, transplantChart: true, directSowChart: true },
  });

  for (const sheet of sheets) {
    const hasNursery = !!(sheet.nurseryChart || sheet.transplantChart);
    const hasDirect = !!sheet.directSowChart;
    let method = null;
    if (hasNursery && hasDirect) method = 'LES_DEUX';
    else if (hasNursery) method = 'PEPINIERE';
    else if (hasDirect) method = 'SEMIS_DIRECT';

    if (method !== sheet.sowingMethod) {
      await prisma.cultureSheet.update({
        where: { id: sheet.id },
        data: { sowingMethod: method },
      });
    }
  }
  console.log('  ✓ Méthodes de semis mises à jour');
}

// --- Main ---

async function main() {
  console.log('🌱 Import des fiches techniques depuis CSV\n');

  // Supprimer les données existantes dans l'ordre des dépendances
  await prisma.taskTemplate.deleteMany();
  await prisma.nurseryRepotStage.deleteMany();
  await prisma.nurseryChart.deleteMany();
  await prisma.transplantChart.deleteMany();
  await prisma.directSowChart.deleteMany();
  await prisma.yieldChart.deleteMany();
  await prisma.cultureSheet.deleteMany();

  // Importer dans l'ordre
  await importNurseryChart();
  await importTransplantChart();
  await importDirectSowChart();
  await importYieldChart();
  await importTaskTemplates();
  await updateSowingMethods();

  // Stats finales
  const stats = {
    species: await prisma.species.count(),
    cultureSheets: await prisma.cultureSheet.count(),
    nurseryCharts: await prisma.nurseryChart.count(),
    transplantCharts: await prisma.transplantChart.count(),
    directSowCharts: await prisma.directSowChart.count(),
    yieldCharts: await prisma.yieldChart.count(),
    taskTemplates: await prisma.taskTemplate.count(),
    repotStages: await prisma.nurseryRepotStage.count(),
  };
  console.log('\n📊 Résumé :', stats);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
