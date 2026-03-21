// Crée les stocks de graines pour les cultivars existants en base
const prisma = require('../src/utils/prisma');

const GRAINES = [
  { cultivar: 'Aubergine Alexandra', species: 'Aubergine', supplier: 'Agrosemens', qty: 100, price: 3.50 },
  { cultivar: 'Aubergine Mini Slim Jim', species: 'Aubergine', supplier: 'Agrosemens', qty: 100, price: 3.50 },
  { cultivar: 'Basilic Grand vert', species: 'Basilic', supplier: 'Agrosemens', qty: 500, price: 2.80 },
  { cultivar: 'Basilic Petite Feuille', species: 'Basilic', supplier: 'Agrosemens', qty: 500, price: 2.80 },
  { cultivar: 'Basilic Citron', species: 'Basilic', supplier: 'Agrosemens', qty: 500, price: 2.80 },
  { cultivar: 'Basilic Canelle', species: 'Basilic', supplier: 'Agrosemens', qty: 500, price: 2.80 },
  { cultivar: 'Concombre (serre) Tanja', species: 'Concombre (serre)', supplier: 'Agrosemens', qty: 50, price: 4.20 },
  { cultivar: 'Concombre (serre) Mirella (mini)', species: 'Concombre (serre)', supplier: 'Agrosemens', qty: 50, price: 4.20 },
  { cultivar: 'Coriandre Petites graines', species: 'Coriandre', supplier: 'Agrosemens', qty: 200, price: 2.50 },
  { cultivar: 'Courgettes d\'été Black beauty (mini)', species: 'Courgettes d\'été', supplier: 'Agrosemens', qty: 50, price: 3.00 },
  { cultivar: 'Courgettes d\'été Verte petite d\'Alger (mini)', species: 'Courgettes d\'été', supplier: 'Agrosemens', qty: 50, price: 3.00 },
  { cultivar: 'Melon Vieille France', species: 'Melon', supplier: 'Agrosemens', qty: 30, price: 4.50 },
  { cultivar: 'Melon Petit Gris de Rennes', species: 'Melon', supplier: 'Agrosemens', qty: 30, price: 4.50 },
  { cultivar: 'Poivrons (serre) Mandarine', species: 'Poivrons (serre)', supplier: 'Agrosemens', qty: 100, price: 3.80 },
  { cultivar: 'Poivrons (serre) Doux long des Landes', species: 'Poivrons (serre)', supplier: 'Agrosemens', qty: 100, price: 3.80 },
  { cultivar: 'Tomates Noire de Crimée', species: 'Tomates', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates Gregori Altai', species: 'Tomates', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates Green Zebra', species: 'Tomates', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates Hawaiian Pineapple (Ananas)', species: 'Tomates', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates cerises Delice des Jardiniers', species: 'Tomates cerises', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates cerises Trigella Bicolore', species: 'Tomates cerises', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates cerises Blush', species: 'Tomates cerises', supplier: 'Agrosemens', qty: 50, price: 3.50 },
  { cultivar: 'Tomates cerises Blue Berries', species: 'Tomates cerises', supplier: 'Agrosemens', qty: 50, price: 3.50 },
];

async function main() {
  console.log('🌾 Création des stocks de graines...\n');

  let created = 0;
  for (const g of GRAINES) {
    const cultivar = await prisma.cultivar.findFirst({
      where: { name: g.cultivar },
    });
    if (!cultivar) {
      console.log('  ⚠ Cultivar introuvable:', g.cultivar);
      continue;
    }

    // Vérifier si un stock existe déjà
    const existing = await prisma.seedInventory.findFirst({
      where: { cultivarId: cultivar.id },
    });
    if (existing) {
      console.log('  ✓ Stock existant:', g.cultivar);
      continue;
    }

    await prisma.seedInventory.create({
      data: {
        cultivarId: cultivar.id,
        supplier: g.supplier,
        initialQuantity: g.qty,
        quantityInStock: g.qty,
        unitPriceEuros: g.price,
      },
    });
    created++;
    console.log('  + Stock créé:', g.cultivar, g.qty, 'graines');
  }

  console.log('\n📊 Résumé:');
  console.log('  Stocks créés:', created);
  console.log('  Total stocks:', await prisma.seedInventory.count());
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
