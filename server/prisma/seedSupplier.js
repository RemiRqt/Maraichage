const prisma = require('../src/utils/prisma');

async function main() {
  const existing = await prisma.supplier.findFirst({ where: { name: 'Agrosemens' } });
  if (existing) {
    console.log('Fournisseur Agrosemens existe déjà');
    // Lier les graines au fournisseur
    const updated = await prisma.seedInventory.updateMany({
      where: { supplierId: null },
      data: { supplierId: existing.id },
    });
    console.log('Graines liées:', updated.count);
    return;
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Agrosemens',
      email: 'contact@agrosemens.com',
      website: 'https://www.agrosemens.com',
      notes: 'Semences biologiques et biodynamiques',
    },
  });
  console.log('Fournisseur créé:', supplier.name);

  // Lier toutes les graines à ce fournisseur
  const updated = await prisma.seedInventory.updateMany({
    where: { supplierId: null },
    data: { supplierId: supplier.id },
  });
  console.log('Graines liées:', updated.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
