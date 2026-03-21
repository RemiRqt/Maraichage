const prisma = require('../src/utils/prisma');

async function main() {
  // Supprimer les tâches en double
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
  const seenTasks = new Set();
  let delTasks = 0;
  for (const t of tasks) {
    const k = t.plantingId + '|' + t.name + '|' + t.scheduledDate?.toISOString();
    if (seenTasks.has(k)) {
      await prisma.task.delete({ where: { id: t.id } });
      delTasks++;
    } else {
      seenTasks.add(k);
    }
  }

  // Supprimer les plantations en double
  const plantings = await prisma.planting.findMany({ orderBy: { createdAt: 'desc' } });
  const seenPl = new Set();
  let delPl = 0;
  for (const pl of plantings) {
    const k = pl.cultivarId + '|' + pl.bedId + '|' + pl.seasonId;
    if (seenPl.has(k)) {
      // Supprimer d'abord les tâches liées
      await prisma.task.deleteMany({ where: { plantingId: pl.id } });
      await prisma.planting.delete({ where: { id: pl.id } });
      delPl++;
    } else {
      seenPl.add(k);
    }
  }

  console.log('Tâches doublons supprimées:', delTasks);
  console.log('Plantations doublons supprimées:', delPl);
  console.log('Plantations restantes:', await prisma.planting.count());
  console.log('Tâches restantes:', await prisma.task.count());
  console.log('TaskTemplates:', await prisma.taskTemplate.count());
  console.log('Seeds:', await prisma.seedInventory.count());
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
