// ============================================================
// Import des plantations 2026 depuis CSV + création saison 2025 fictive
// Usage: node prisma/seedPlantations.js
// ============================================================

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '..', '..', 'csv', 'Plantation-nocode.csv');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseDateFr(val) {
  if (!val) return null;
  // Format: DD/MM/YYYY ou D/M/YYYY
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00.000Z`);
}

function parseDecFr(val) {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : n;
}

async function main() {
  console.log('🌱 Import des plantations depuis CSV\n');

  // 1. Récupérer ou créer la saison 2026
  let season2026 = await prisma.season.findFirst({ where: { name: { contains: '2026' } } });
  if (!season2026) {
    season2026 = await prisma.season.create({
      data: {
        name: 'Saison 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      },
    });
    console.log('  + Saison 2026 créée');
  }

  // 2. Créer une saison 2025 fictive
  let season2025 = await prisma.season.findFirst({ where: { name: { contains: '2025' } } });
  if (!season2025) {
    season2025 = await prisma.season.create({
      data: {
        name: 'Saison 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: false,
      },
    });
    console.log('  + Saison 2025 fictive créée');
  } else {
    console.log('  ✓ Saison 2025 existante');
  }

  // 3. Charger les données de référence
  const allBeds = await prisma.bed.findMany();
  const allSpecies = await prisma.species.findMany();
  const allCultivars = await prisma.cultivar.findMany({ include: { species: true } });
  const allSheets = await prisma.cultureSheet.findMany();

  // Helpers
  function findBed(name) {
    if (!name) return null;
    // Normaliser: "Serre 01" → "Serre-01", "Nord 05" → "Nord-05"
    const normalized = name.replace(/\s+(\d)/, '-$1').replace(/\s+/, '-');
    return allBeds.find(b =>
      b.name.toLowerCase() === name.toLowerCase() ||
      b.name.toLowerCase() === normalized.toLowerCase()
    );
  }

  function findSpecies(name) {
    if (!name) return null;
    return allSpecies.find(s => s.name.toLowerCase() === name.toLowerCase());
  }

  async function findOrCreateCultivar(cultivarName, speciesName) {
    const species = findSpecies(speciesName);
    if (!species) {
      console.log(`    ⚠ Espèce introuvable: ${speciesName}`);
      return null;
    }

    // Chercher le cultivar existant
    let cv = allCultivars.find(c =>
      c.name.toLowerCase() === cultivarName.toLowerCase() &&
      c.speciesId === species.id
    );
    if (cv) return cv;

    // Créer le cultivar
    cv = await prisma.cultivar.create({
      data: { name: cultivarName, speciesId: species.id },
    });
    allCultivars.push({ ...cv, species });
    console.log(`    + Cultivar créé: ${cultivarName} (${speciesName})`);
    return cv;
  }

  function findSheet(speciesName) {
    const species = findSpecies(speciesName);
    if (!species) return null;
    return allSheets.find(s => s.speciesId === species.id) || null;
  }

  // 4. Parser le CSV
  const rows = parseCSV(CSV_PATH);
  console.log(`\n📋 ${rows.length} plantations à importer\n`);

  let created2026 = 0;

  for (const row of rows) {
    const cultivarName = row['Cultivar'];
    const speciesName = row['Espèces'];
    const bedName = row['Planche'];
    const sowingDateStr = row['Date début pépinière'] || row['Date plantation'];
    const plantingDateStr = row['Date plantation'];
    const harvestDateStr = row['Date début récolte'];
    const endHarvestStr = row['Date fin de récolte'] || row['Date fin récolte'];
    const method = row['Méthode de culture'];
    const portionM2 = parseDecFr(row['portion planche m2']);
    const expectedYieldKg = parseDecFr(row['Prevision de rendement en KG']);
    const notes = row['Notes'] || null;

    if (!cultivarName || !speciesName) {
      console.log(`  ⊘ Ligne ignorée (pas de cultivar/espèce)`);
      continue;
    }

    const cultivar = await findOrCreateCultivar(cultivarName, speciesName);
    if (!cultivar) continue;

    const bed = findBed(bedName);
    if (!bed) {
      console.log(`    ⚠ Planche introuvable: "${bedName}" pour ${cultivarName}`);
      continue;
    }

    const sheet = findSheet(speciesName);
    const sowingDate = parseDateFr(sowingDateStr);
    const transplantDate = parseDateFr(plantingDateStr);
    const expectedHarvestDate = parseDateFr(harvestDateStr);

    // Déterminer le statut
    const now = new Date();
    let status = 'PLANIFIE';
    if (sowingDate && sowingDate <= now) status = 'SEME';
    if (transplantDate && transplantDate <= now) status = 'TRANSPLANTE';
    if (expectedHarvestDate && expectedHarvestDate <= now) status = 'EN_RECOLTE';

    // Créer la plantation 2026
    await prisma.planting.create({
      data: {
        seasonId: season2026.id,
        bedId: bed.id,
        cultivarId: cultivar.id,
        cultureSheetId: sheet?.id || null,
        sowingDate: sowingDate || new Date('2026-03-22'),
        transplantDate: method === 'Transplants' ? transplantDate : null,
        expectedHarvestDate,
        expectedYieldKg,
        quantityPlanted: portionM2 ? Math.round(portionM2) : 0,
        status,
        notes,
      },
    });
    created2026++;
    console.log(`  ✓ ${cultivarName} → ${bedName} (${status})`);
  }

  // 5. Créer des plantations fictives 2025 (décalées d'un an)
  console.log('\n📋 Création plantations fictives 2025...');
  let created2025 = 0;

  for (const row of rows) {
    const cultivarName = row['Cultivar'];
    const speciesName = row['Espèces'];
    const bedName = row['Planche'];

    if (!cultivarName || !speciesName) continue;

    const cultivar = allCultivars.find(c =>
      c.name.toLowerCase() === cultivarName.toLowerCase()
    );
    const bed = findBed(bedName);
    const sheet = findSheet(speciesName);

    if (!cultivar || !bed) continue;

    const sowingDate2025 = parseDateFr(row['Date début pépinière'] || row['Date plantation']);
    const transplantDate2025 = parseDateFr(row['Date plantation']);
    const harvestDate2025 = parseDateFr(row['Date début récolte']);
    const expectedYieldKg = parseDecFr(row['Prevision de rendement en KG']);

    // Décaler d'un an
    const shift = (d) => {
      if (!d) return null;
      const nd = new Date(d);
      nd.setFullYear(nd.getFullYear() - 1);
      return nd;
    };

    await prisma.planting.create({
      data: {
        seasonId: season2025.id,
        bedId: bed.id,
        cultivarId: cultivar.id,
        cultureSheetId: sheet?.id || null,
        sowingDate: shift(sowingDate2025) || new Date('2025-03-22'),
        transplantDate: shift(transplantDate2025),
        expectedHarvestDate: shift(harvestDate2025),
        actualFirstHarvestDate: shift(harvestDate2025),
        expectedYieldKg,
        quantityPlanted: 0,
        status: 'TERMINE',
        notes: 'Saison 2025 (données fictives)',
      },
    });
    created2025++;
  }

  console.log(`\n📊 Résumé :`);
  console.log(`  Plantations 2026 créées : ${created2026}`);
  console.log(`  Plantations 2025 fictives : ${created2025}`);
  console.log(`  Cultivars total : ${await prisma.cultivar.count()}`);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
