// ============================================================
// Dédoublonnage cultivars : fusionne les cultivars CSV vers les
// cultivars du seed original (qui ont les graines)
// Usage: node prisma/deduplicateCultivars.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping: cultivar CSV → cultivar seed (par nom normalisé)
// Format: [csv cultivar name, csv species name, seed cultivar name, seed species name]
const MERGE_MAP = [
  // Aubergine
  ['Aubergine Alexandra', 'Aubergine', 'Alexandra', 'Aubergine'],
  ['Aubergine Mini Slim Jim', 'Aubergine', 'Slim Jim', 'Aubergine'],
  // Basilic
  ['Basilic Grand vert', 'Basilic', 'Genovese (Grand Vert)', 'Basilic'],
  ['Basilic Petite Feuille', 'Basilic', 'À petites feuilles', 'Basilic'],
  ['Basilic Citron', 'Basilic', 'Citron', 'Basilic'],
  ['Basilic Canelle', 'Basilic', 'Cannelle', 'Basilic'],
  // Concombre (serre) → Concombre
  ['Concombre (serre) Tanja', 'Concombre (serre)', 'Vert long maraicher', 'Concombre'],
  ['Concombre (serre) Mirella (mini)', 'Concombre (serre)', 'Mirella', 'Concombre'],
  // Coriandre
  ['Coriandre Petites graines', 'Coriandre', 'À Petites Graines', 'Coriandre'],
  // Courgettes d'été → Courgette
  ['Courgettes d\'été Black beauty (mini)', 'Courgettes d\'été', 'Black Beauty', 'Courgette'],
  ['Courgettes d\'été Verte petite d\'Alger (mini)', 'Courgettes d\'été', 'Verte petite d\'Alger', 'Courgette'],
  // Melon
  ['Melon Vieille France', 'Melon', 'Vieille France', 'Melon'],
  ['Melon Petit Gris de Rennes', 'Melon', 'Petit Gris de Rennes', 'Melon'],
  // Poivrons (serre) → Poivron
  ['Poivrons (serre) Mandarine', 'Poivrons (serre)', 'Mandarine', 'Poivron'],
  ['Poivrons (serre) Doux long des Landes', 'Poivrons (serre)', 'Doux Long des Landes', 'Poivron'],
  // Tomates → Tomate
  ['Tomates Noire de Crimée', 'Tomates', 'Noire de Crimée', 'Tomate'],
  ['Tomates Gregori Altai', 'Tomates', 'Grégori Altaï', 'Tomate'],
  ['Tomates Green Zebra', 'Tomates', 'Green Zebra', 'Tomate'],
  ['Tomates Hawaiian Pineapple (Ananas)', 'Tomates', 'Hawaiian Pineapple', 'Tomate'],
  // Tomates cerises → Tomate
  ['Tomates cerises Delice des Jardiniers', 'Tomates cerises', 'Délice des Jardiniers', 'Tomate'],
  ['Tomates cerises Trigella Bicolore', 'Tomates cerises', 'Cocktail Tigrella Bicolore', 'Tomate'],
  ['Tomates cerises Blush', 'Tomates cerises', 'Blush', 'Tomate'],
  ['Tomates cerises Blue Berries', 'Tomates cerises', 'Blue Berries', 'Tomate'],
];

async function main() {
  console.log('🔧 Dédoublonnage cultivars\n');

  const allCultivars = await prisma.cultivar.findMany({ include: { species: true } });
  const allSpecies = await prisma.species.findMany();

  function findCultivar(name, speciesName) {
    return allCultivars.find(c =>
      c.name === name && c.species?.name === speciesName
    );
  }

  let merged = 0;
  let deleted = 0;

  for (const [csvCvName, csvSpName, seedCvName, seedSpName] of MERGE_MAP) {
    const csvCv = findCultivar(csvCvName, csvSpName);
    const seedCv = findCultivar(seedCvName, seedSpName);

    if (!csvCv) {
      console.log(`  ⊘ CSV cultivar introuvable: ${csvCvName} (${csvSpName})`);
      continue;
    }
    if (!seedCv) {
      console.log(`  ⊘ Seed cultivar introuvable: ${seedCvName} (${seedSpName})`);
      continue;
    }

    console.log(`  🔗 ${csvCvName} (${csvSpName}) → ${seedCvName} (${seedSpName})`);

    // Migrer les plantations
    const plantingsUpdated = await prisma.planting.updateMany({
      where: { cultivarId: csvCv.id },
      data: { cultivarId: seedCv.id },
    });
    if (plantingsUpdated.count > 0) {
      console.log(`     ↳ ${plantingsUpdated.count} plantation(s) migrée(s)`);
    }

    // Migrer les lots pépinière
    const batchesUpdated = await prisma.nurseryBatch.updateMany({
      where: { cultivarId: csvCv.id },
      data: { cultivarId: seedCv.id },
    });
    if (batchesUpdated.count > 0) {
      console.log(`     ↳ ${batchesUpdated.count} lot(s) pépinière migré(s)`);
    }

    // Supprimer le cultivar CSV doublon
    await prisma.cultivar.delete({ where: { id: csvCv.id } });
    deleted++;
    merged++;
  }

  // Aussi lier les CultureSheets des espèces CSV aux espèces seed si nécessaire
  // Ex: "Tomates" a un CultureSheet mais "Tomate" (seed) n'en a pas
  const SPECIES_MERGE = [
    ['Concombre (serre)', 'Concombre'],
    ['Courgettes d\'été', 'Courgette'],
    ['Poivrons (serre)', 'Poivron'],
    ['Tomates', 'Tomate'],
    ['Tomates cerises', 'Tomate'],
    ['Tomates ancestrales', 'Tomate'],
    ['Shiso (Périlla pourpre)', 'Perilla'],
  ];

  console.log('\n🔧 Vérification des CultureSheets espèces...');
  for (const [csvSpName, seedSpName] of SPECIES_MERGE) {
    const csvSp = allSpecies.find(s => s.name === csvSpName);
    const seedSp = allSpecies.find(s => s.name === seedSpName);
    if (!csvSp || !seedSp) continue;

    // Si l'espèce seed n'a pas de CultureSheet mais la CSV en a une, transférer
    const seedSheet = await prisma.cultureSheet.findUnique({ where: { speciesId: seedSp.id } });
    const csvSheet = await prisma.cultureSheet.findUnique({ where: { speciesId: csvSp.id } });

    if (!seedSheet && csvSheet) {
      // Transférer la fiche vers l'espèce seed
      await prisma.cultureSheet.update({
        where: { id: csvSheet.id },
        data: { speciesId: seedSp.id },
      });
      console.log(`  📋 CultureSheet ${csvSpName} → ${seedSpName}`);
    }
  }

  console.log(`\n📊 Résumé :`);
  console.log(`  ${merged} cultivar(s) fusionné(s)`);
  console.log(`  ${deleted} cultivar(s) doublon(s) supprimé(s)`);
  console.log(`  Cultivars restants: ${await prisma.cultivar.count()}`);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
