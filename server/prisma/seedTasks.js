// Génère les tâches depuis les TaskTemplates pour toutes les plantations
const prisma = require('../src/utils/prisma');

async function main() {
  console.log('✅ Génération des tâches...\n');

  // Supprimer les tâches existantes
  const deleted = await prisma.task.deleteMany();
  console.log('  Tâches supprimées:', deleted.count);

  const plantings = await prisma.planting.findMany({
    where: { cultureSheetId: { not: null } },
    include: {
      cultureSheet: { include: { taskTemplates: { orderBy: { positionOrder: 'asc' } } } },
      bed: true,
      cultivar: true,
      season: true,
    },
  });

  let created = 0;
  for (const p of plantings) {
    const templates = p.cultureSheet?.taskTemplates || [];
    if (templates.length === 0) continue;

    const tc = await prisma.transplantChart.findUnique({ where: { cultureSheetId: p.cultureSheetId } });
    const dc = await prisma.directSowChart.findUnique({ where: { cultureSheetId: p.cultureSheetId } });

    for (const t of templates) {
      const tplName = (t.templateName || t.name || '').toLowerCase().trim();
      let scheduledDate = null;

      if (tplName.includes('semis') && tplName.includes('pépi')) {
        scheduledDate = new Date(p.sowingDate);
      } else if (tplName.includes('semis direct')) {
        scheduledDate = new Date(p.sowingDate);
      } else if (tplName.includes('transplant')) {
        if (p.transplantDate) {
          scheduledDate = new Date(p.transplantDate);
        } else if (tc?.nurseryDurationDays) {
          scheduledDate = new Date(p.sowingDate);
          scheduledDate.setDate(scheduledDate.getDate() + tc.nurseryDurationDays);
        }
      } else if (tplName.includes('récolte') || tplName.includes('recolte')) {
        if (p.expectedHarvestDate) {
          scheduledDate = new Date(p.expectedHarvestDate);
        }
      } else {
        const offsetDays = t.direction === 'AVANT' ? -t.daysOffset : t.daysOffset;
        scheduledDate = new Date(p.sowingDate);
        scheduledDate.setDate(scheduledDate.getDate() + offsetDays);
      }

      if (!scheduledDate) continue;

      // Tâches 2025 → terminées
      const isDone = p.season?.name?.includes('2025');

      await prisma.task.create({
        data: {
          plantingId: p.id,
          bedId: p.bedId,
          taskTemplateId: t.id,
          name: t.name,
          description: t.description,
          scheduledDate,
          priority: 'NORMALE',
          status: isDone ? 'FAIT' : 'A_FAIRE',
          completedDate: isDone ? new Date('2025-09-01') : null,
        },
      });
      created++;
    }
  }

  console.log('  Tâches créées:', created);

  const counts = {};
  const tasks = await prisma.task.findMany({ select: { scheduledDate: true, status: true } });
  tasks.forEach(t => {
    const m = t.scheduledDate.toISOString().slice(0, 7);
    counts[m] = (counts[m] || 0) + 1;
  });
  console.log('  Par mois:', counts);
  console.log('  A_FAIRE:', tasks.filter(t => t.status === 'A_FAIRE').length);
  console.log('  FAIT:', tasks.filter(t => t.status === 'FAIT').length);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
