// ============================================================
// Seed initial — MalaMaraichageApp
// Données de départ : zones, planches, saison 2025, utilisateurs
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // ---- Utilisateurs initiaux ----
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    const maraicherPassword = await bcrypt.hash('maraicher2025', 12);
    const responsablePassword = await bcrypt.hash('responsable2025', 12);

    await prisma.user.createMany({
      data: [
        {
          email: 'maraicher@exploitation.fr',
          password: maraicherPassword,
          name: 'Maraîcher',
          role: 'MARAICHER',
        },
        {
          email: 'responsable@exploitation.fr',
          password: responsablePassword,
          name: 'Responsable du site',
          role: 'RESPONSABLE',
        },
      ],
    });
    console.log('✅ Utilisateurs créés');
  }

  // ---- Saison 2025 ----
  const existingSeasons = await prisma.season.count();
  if (existingSeasons === 0) {
    await prisma.season.create({
      data: {
        name: 'Saison 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        isActive: true,
      },
    });
    console.log('✅ Saison 2025 créée');
  }

  // ---- Zones et planches ----
  const existingZones = await prisma.zone.count();
  if (existingZones === 0) {
    // Dimensions par défaut : 10m × 0.80m = 8m²
    const DEFAULT_LENGTH = 10.0;
    const DEFAULT_WIDTH = 0.80;
    const DEFAULT_AREA = DEFAULT_LENGTH * DEFAULT_WIDTH;

    // Zone Serre — 14 planches
    const serre = await prisma.zone.create({
      data: {
        name: 'Serre',
        description: 'Serre de culture principale',
      },
    });

    const serreBeds = [];
    for (let i = 1; i <= 14; i++) {
      serreBeds.push({
        zoneId: serre.id,
        name: `Serre-${String(i).padStart(2, '0')}`,
        lengthM: DEFAULT_LENGTH,
        widthM: DEFAULT_WIDTH,
        areaM2: DEFAULT_AREA,
        positionOrder: i,
      });
    }
    await prisma.bed.createMany({ data: serreBeds });

    // Zone Nord — 25 planches
    const nord = await prisma.zone.create({
      data: {
        name: 'Zone Nord',
        description: 'Parcelle nord de l\'exploitation',
      },
    });

    const nordBeds = [];
    for (let i = 1; i <= 25; i++) {
      nordBeds.push({
        zoneId: nord.id,
        name: `Nord-${String(i).padStart(2, '0')}`,
        lengthM: DEFAULT_LENGTH,
        widthM: DEFAULT_WIDTH,
        areaM2: DEFAULT_AREA,
        positionOrder: i,
      });
    }
    await prisma.bed.createMany({ data: nordBeds });

    // Zone Sud — 10 planches
    const sud = await prisma.zone.create({
      data: {
        name: 'Zone Sud',
        description: 'Parcelle sud de l\'exploitation',
      },
    });

    const sudBeds = [];
    for (let i = 1; i <= 10; i++) {
      sudBeds.push({
        zoneId: sud.id,
        name: `Sud-${String(i).padStart(2, '0')}`,
        lengthM: DEFAULT_LENGTH,
        widthM: DEFAULT_WIDTH,
        areaM2: DEFAULT_AREA,
        positionOrder: i,
      });
    }
    await prisma.bed.createMany({ data: sudBeds });

    console.log('✅ Zones et 49 planches créées');
  }

  // ---- Familles botaniques courantes (espèces exemples) ----
  const existingSpecies = await prisma.species.count();
  if (existingSpecies === 0) {
    await prisma.species.createMany({
      data: [
        { name: 'Tomate', family: 'Solanacées', category: 'LEGUME' },
        { name: 'Poivron', family: 'Solanacées', category: 'LEGUME' },
        { name: 'Aubergine', family: 'Solanacées', category: 'LEGUME' },
        { name: 'Piment', family: 'Solanacées', category: 'LEGUME' },
        { name: 'Concombre', family: 'Cucurbitacées', category: 'LEGUME' },
        { name: 'Courgette', family: 'Cucurbitacées', category: 'LEGUME' },
        { name: 'Melon', family: 'Cucurbitacées', category: 'FRUIT' },
        { name: 'Potiron', family: 'Cucurbitacées', category: 'LEGUME' },
        { name: 'Carotte', family: 'Apiacées', category: 'LEGUME' },
        { name: 'Fenouil', family: 'Apiacées', category: 'LEGUME' },
        { name: 'Cerfeuil', family: 'Apiacées', category: 'AROMATIQUE' },
        { name: 'Chou', family: 'Brassicacées', category: 'LEGUME' },
        { name: 'Radis', family: 'Brassicacées', category: 'LEGUME' },
        { name: 'Roquette', family: 'Brassicacées', category: 'LEGUME' },
        { name: 'Navet', family: 'Brassicacées', category: 'LEGUME' },
        { name: 'Haricot', family: 'Fabacées', category: 'LEGUME' },
        { name: 'Pois', family: 'Fabacées', category: 'LEGUME' },
        { name: 'Fève', family: 'Fabacées', category: 'LEGUME' },
        { name: 'Oignon', family: 'Alliacées', category: 'LEGUME' },
        { name: 'Ail', family: 'Alliacées', category: 'LEGUME' },
        { name: 'Poireau', family: 'Alliacées', category: 'LEGUME' },
        { name: 'Ciboulette', family: 'Alliacées', category: 'AROMATIQUE' },
        { name: 'Laitue', family: 'Astéracées', category: 'LEGUME' },
        { name: 'Chicorée', family: 'Astéracées', category: 'LEGUME' },
        { name: 'Artichaut', family: 'Astéracées', category: 'LEGUME' },
        { name: 'Épinard', family: 'Chénopodiacées', category: 'LEGUME' },
        { name: 'Betterave', family: 'Chénopodiacées', category: 'LEGUME' },
        { name: 'Basilic', family: 'Lamiacées', category: 'AROMATIQUE' },
        { name: 'Thym', family: 'Lamiacées', category: 'AROMATIQUE' },
        { name: 'Menthe', family: 'Lamiacées', category: 'AROMATIQUE' },
        { name: 'Sarriette', family: 'Lamiacées', category: 'AROMATIQUE' },
        { name: 'Fraise', family: 'Rosacées', category: 'FRUIT' },
        { name: 'Framboise', family: 'Rosacées', category: 'FRUIT' },
        { name: 'Maïs', family: 'Poacées', category: 'LEGUME' },
        { name: 'Mâche', family: 'Valérianacées', category: 'LEGUME' },
        { name: 'Patate douce', family: 'Convolvulacées', category: 'LEGUME' },
        { name: 'Oseille', family: 'Polygonacées', category: 'LEGUME' },
        { name: 'Rhubarbe', family: 'Polygonacées', category: 'LEGUME' },
      ],
    });
    console.log('✅ Espèces créées');
  }

  // ---- Paramètres par défaut ----
  const existingSettings = await prisma.appSetting.count();
  if (existingSettings === 0) {
    await prisma.appSetting.createMany({
      data: [
        { key: 'exploitation_name', value: 'Exploitation Maraîchère Mormant' },
        { key: 'exploitation_location', value: 'Mormant, Seine-et-Marne (77720)' },
        { key: 'latitude', value: '48.6114' },
        { key: 'longitude', value: '2.8856' },
        { key: 'default_bed_length_m', value: '10' },
        { key: 'default_bed_width_m', value: '0.80' },
        { key: 'hourly_rate_euros', value: '' },
      ],
    });
    console.log('✅ Paramètres créés');
  }

  console.log('🌱 Seed terminé avec succès !');
  console.log('');
  console.log('Comptes utilisateurs par défaut :');
  console.log('  Maraîcher    → maraicher@exploitation.fr / maraicher2025');
  console.log('  Responsable  → responsable@exploitation.fr / responsable2025');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
