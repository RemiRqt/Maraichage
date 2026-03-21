const p = require('../src/utils/prisma');
async function main() {
  const cvs = await p.cultivar.findMany({ include: { species: true, seedInventory: true } });
  cvs.forEach(c => console.log(c.name, '-', c.species?.name, '- graines:', c.seedInventory.length));
  console.log('\nTotal cultivars:', cvs.length);
  console.log('Total seeds:', await p.seedInventory.count());
  console.log('Total plantings:', await p.planting.count());
  console.log('Total tasks:', await p.task.count());
  console.log('Total species:', await p.species.count());
}
main().catch(console.error).finally(() => p.$disconnect());
