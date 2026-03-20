// ============================================================
// Seed données réalistes — Saison 2026
// Exploitation maraîchère Mormant 77720
// À exécuter : node prisma/seed_2026.js
// ============================================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed saison 2026 — données réalistes...');

  // ---- Récupérer les données existantes ----
  const saison2026 = await prisma.season.findFirst({ where: { name: 'Saison 2026' } });
  if (!saison2026) throw new Error('Saison 2026 introuvable — créez-la d\'abord via l\'interface.');

  const allBeds = await prisma.bed.findMany({ include: { zone: true }, orderBy: { name: 'asc' } });
  const allSpecies = await prisma.species.findMany();

  const byName = (list, name) => list.find(i => i.name === name);
  const byZone = (zoneName) => allBeds.filter(b => b.zone.name === zoneName);

  const serre = byZone('Serre');
  const nord  = byZone('Zone Nord');
  const sud   = byZone('Zone Sud');

  console.log(`  → ${serre.length} planches Serre, ${nord.length} Nord, ${sud.length} Sud`);

  // ---- Cultivars réalistes ----
  console.log('  → Création des cultivars...');

  const cultivarDefs = [
    // Tomates (serre)
    { name: 'Tomate Cœur de Bœuf',    species: 'Tomate',   desc: 'Grosse tomate charnue, heirloom' },
    { name: 'Tomate Noire de Crimée',  species: 'Tomate',   desc: 'Tomate noire, saveur intense' },
    { name: 'Tomate Ananas',           species: 'Tomate',   desc: 'Bicolore jaune-rouge, très sucrée' },
    { name: 'Tomate Green Zebra',      species: 'Tomate',   desc: 'Rayée vert-jaune, acidulée' },
    // Laitues
    { name: 'Laitue Batavia Rouge',    species: 'Laitue',   desc: 'Feuilles rouges croquantes' },
    { name: 'Laitue Merveille 4 Saisons', species: 'Laitue', desc: 'Pommée, résistante au froid' },
    { name: 'Laitue Blonde de Paris',  species: 'Laitue',   desc: 'Classique, feuilles tendres' },
    // Carottes
    { name: 'Carotte Nantaise',        species: 'Carotte',  desc: 'Cylindrique, douce et croquante' },
    { name: 'Carotte Chantenay Rouge', species: 'Carotte',  desc: 'Courte et conique, bonne conservation' },
    // Radis
    { name: 'Radis de 18 jours',       species: 'Radis',    desc: 'Très rapide, doux' },
    { name: 'Radis Noir Gros Long',    species: 'Radis',    desc: 'Automne-hiver, fort' },
    // Épinards
    { name: 'Épinard Monstrueux de Viroflay', species: 'Épinard', desc: 'Grandes feuilles, productif' },
    // Courgettes (serre)
    { name: 'Courgette Black Beauty',  species: 'Courgette', desc: 'Foncée, productive' },
    { name: 'Courgette Jaune Gold Rush', species: 'Courgette', desc: 'Jaune dorée, décorative' },
    // Poireaux
    { name: 'Poireau Bleu de Solaize', species: 'Poireau',  desc: 'Rustique, bonne résistance au froid' },
    { name: 'Poireau Monstrueux de Carentan', species: 'Poireau', desc: 'Gros calibre, fût blanc long' },
    // Betterave
    { name: 'Betterave Chioggia',      species: 'Betterave', desc: 'Bicolore rouge-blanc, douce' },
    { name: 'Betterave Crapaudine',    species: 'Betterave', desc: 'Ancienne variété, très sucrée' },
    // Mâche
    { name: 'Mâche Verte de Cambrai',  species: 'Mâche',    desc: 'Petites feuilles rondes, résistante' },
    // Haricots
    { name: 'Haricot Beurre de Rocquencourt', species: 'Haricot', desc: 'Jaune, sans fil' },
    { name: 'Haricot Mangetout à Rames', species: 'Haricot', desc: 'Grimpant, très productif' },
    // Roquette
    { name: 'Roquette Sauvage',        species: 'Roquette',  desc: 'Feuilles découpées, très aromatique' },
    // Concombre serre
    { name: 'Concombre Marketmore',    species: 'Concombre', desc: 'Classique, long et vert' },
    // Basilic
    { name: 'Basilic Grand Vert Genovese', species: 'Basilic', desc: 'Grandes feuilles, parfumé' },
    { name: 'Basilic Pourpre Opale',   species: 'Basilic',  desc: 'Feuilles violettes, décoratif' },
    // Oignon
    { name: 'Oignon Rouge de Florence', species: 'Oignon',  desc: 'Doux, allongé' },
    // Fenouil
    { name: 'Fenouil Zefa Fino',       species: 'Fenouil',  desc: 'Bulbe volumineux, tardif' },
  ];

  const cultivarMap = {}; // name → id
  for (const def of cultivarDefs) {
    const sp = byName(allSpecies, def.species);
    if (!sp) { console.warn(`  ⚠️  Espèce "${def.species}" introuvable, skip.`); continue; }
    const existing = await prisma.cultivar.findFirst({ where: { name: def.name } });
    if (existing) {
      cultivarMap[def.name] = existing.id;
    } else {
      const c = await prisma.cultivar.create({
        data: { name: def.name, speciesId: sp.id, description: def.desc },
      });
      cultivarMap[def.name] = c.id;
    }
  }
  console.log(`  → ${Object.keys(cultivarMap).length} cultivars prêts`);

  // ---- Plantations réalistes (état au 19 mars 2026) ----
  // Statuts possibles : PLANIFIE | SEME | EN_PEPINIERE | TRANSPLANTE | EN_CROISSANCE | EN_RECOLTE | TERMINE | ECHEC
  const plantingDefs = [
    // === SERRE (14 planches) ===
    // Tomates semées en pépinière fin jan, transplantation prévue avril
    { bed: serre[0],  cultivar: 'Tomate Cœur de Bœuf',    sowing: '2026-01-20', status: 'EN_PEPINIERE', qty: 12, expectedHarvest: '2026-06-15', expectedYield: 18 },
    { bed: serre[1],  cultivar: 'Tomate Noire de Crimée',  sowing: '2026-01-20', status: 'EN_PEPINIERE', qty: 12, expectedHarvest: '2026-06-20', expectedYield: 16 },
    { bed: serre[2],  cultivar: 'Tomate Ananas',           sowing: '2026-01-22', status: 'EN_PEPINIERE', qty: 10, expectedHarvest: '2026-06-25', expectedYield: 14 },
    { bed: serre[3],  cultivar: 'Tomate Green Zebra',      sowing: '2026-01-22', status: 'EN_PEPINIERE', qty: 10, expectedHarvest: '2026-06-25', expectedYield: 14 },
    // Courgettes serre — semées debut mars
    { bed: serre[4],  cultivar: 'Courgette Black Beauty',  sowing: '2026-03-01', status: 'SEME', qty: 6, expectedHarvest: '2026-05-10', expectedYield: 20 },
    { bed: serre[5],  cultivar: 'Courgette Jaune Gold Rush', sowing: '2026-03-01', status: 'SEME', qty: 6, expectedHarvest: '2026-05-10', expectedYield: 18 },
    // Concombre serre
    { bed: serre[6],  cultivar: 'Concombre Marketmore',    sowing: '2026-02-15', status: 'EN_PEPINIERE', qty: 8, expectedHarvest: '2026-05-20', expectedYield: 22 },
    // Basilic serre (en récolte)
    { bed: serre[7],  cultivar: 'Basilic Grand Vert Genovese', sowing: '2026-01-10', status: 'EN_RECOLTE', qty: 30, expectedHarvest: '2026-03-01', expectedYield: 4 },
    { bed: serre[8],  cultivar: 'Basilic Pourpre Opale',   sowing: '2026-01-10', status: 'EN_RECOLTE', qty: 25, expectedHarvest: '2026-03-01', expectedYield: 3 },
    // Laitue serre (en récolte)
    { bed: serre[9],  cultivar: 'Laitue Blonde de Paris',  sowing: '2025-12-15', status: 'EN_RECOLTE', qty: 40, expectedHarvest: '2026-02-20', expectedYield: 6 },
    { bed: serre[10], cultivar: 'Laitue Batavia Rouge',    sowing: '2025-12-15', status: 'EN_RECOLTE', qty: 40, expectedHarvest: '2026-02-20', expectedYield: 6 },
    // Radis serre (terminé, rotation rapide)
    { bed: serre[11], cultivar: 'Radis de 18 jours',       sowing: '2026-02-01', status: 'TERMINE', qty: 200, expectedHarvest: '2026-02-20', expectedYield: 3 },
    // Roquette serre
    { bed: serre[12], cultivar: 'Roquette Sauvage',        sowing: '2025-12-20', status: 'EN_RECOLTE', qty: 80, expectedHarvest: '2026-02-01', expectedYield: 5 },
    // Mâche serre
    { bed: serre[13], cultivar: 'Mâche Verte de Cambrai',  sowing: '2025-11-15', status: 'EN_RECOLTE', qty: 120, expectedHarvest: '2026-01-15', expectedYield: 4 },

    // === ZONE NORD (25 planches) ===
    // Poireaux (en récolte — plantés été 2025, récoltés cet hiver)
    { bed: nord[0],  cultivar: 'Poireau Bleu de Solaize',         sowing: '2025-06-01', status: 'EN_RECOLTE', qty: 80, expectedHarvest: '2025-11-01', expectedYield: 10 },
    { bed: nord[1],  cultivar: 'Poireau Bleu de Solaize',         sowing: '2025-06-01', status: 'EN_RECOLTE', qty: 80, expectedHarvest: '2025-11-01', expectedYield: 10 },
    { bed: nord[2],  cultivar: 'Poireau Monstrueux de Carentan',  sowing: '2025-06-15', status: 'EN_RECOLTE', qty: 70, expectedHarvest: '2025-12-01', expectedYield: 12 },
    // Épinards nord (en récolte)
    { bed: nord[3],  cultivar: 'Épinard Monstrueux de Viroflay',  sowing: '2026-01-20', status: 'EN_CROISSANCE', qty: 150, expectedHarvest: '2026-04-01', expectedYield: 8 },
    { bed: nord[4],  cultivar: 'Épinard Monstrueux de Viroflay',  sowing: '2026-01-20', status: 'EN_CROISSANCE', qty: 150, expectedHarvest: '2026-04-01', expectedYield: 8 },
    // Carottes (semées début mars, en croissance)
    { bed: nord[5],  cultivar: 'Carotte Nantaise',        sowing: '2026-03-05', status: 'SEME', qty: 300, expectedHarvest: '2026-06-20', expectedYield: 12 },
    { bed: nord[6],  cultivar: 'Carotte Nantaise',        sowing: '2026-03-05', status: 'SEME', qty: 300, expectedHarvest: '2026-06-20', expectedYield: 12 },
    { bed: nord[7],  cultivar: 'Carotte Chantenay Rouge', sowing: '2026-03-10', status: 'SEME', qty: 250, expectedHarvest: '2026-07-10', expectedYield: 11 },
    // Radis de plein champ
    { bed: nord[8],  cultivar: 'Radis de 18 jours',       sowing: '2026-03-10', status: 'SEME', qty: 400, expectedHarvest: '2026-03-28', expectedYield: 5 },
    // Mâche nord (en récolte)
    { bed: nord[9],  cultivar: 'Mâche Verte de Cambrai',  sowing: '2025-09-01', status: 'EN_RECOLTE', qty: 200, expectedHarvest: '2025-11-01', expectedYield: 6 },
    { bed: nord[10], cultivar: 'Mâche Verte de Cambrai',  sowing: '2025-09-01', status: 'EN_RECOLTE', qty: 200, expectedHarvest: '2025-11-01', expectedYield: 6 },
    // Laitues nord (en croissance, semées sous abri)
    { bed: nord[11], cultivar: 'Laitue Merveille 4 Saisons', sowing: '2026-02-10', status: 'EN_CROISSANCE', qty: 48, expectedHarvest: '2026-04-15', expectedYield: 5 },
    { bed: nord[12], cultivar: 'Laitue Batavia Rouge',    sowing: '2026-02-10', status: 'EN_CROISSANCE', qty: 48, expectedHarvest: '2026-04-15', expectedYield: 5 },
    // Betteraves (semées début mars)
    { bed: nord[13], cultivar: 'Betterave Chioggia',      sowing: '2026-03-01', status: 'SEME', qty: 120, expectedHarvest: '2026-06-15', expectedYield: 10 },
    { bed: nord[14], cultivar: 'Betterave Crapaudine',    sowing: '2026-03-01', status: 'SEME', qty: 100, expectedHarvest: '2026-07-01', expectedYield: 9 },
    // Haricots planifiés pour mai
    { bed: nord[15], cultivar: 'Haricot Beurre de Rocquencourt', sowing: '2026-05-01', status: 'PLANIFIE', qty: 150, expectedHarvest: '2026-07-15', expectedYield: 8 },
    { bed: nord[16], cultivar: 'Haricot Mangetout à Rames', sowing: '2026-05-10', status: 'PLANIFIE', qty: 100, expectedHarvest: '2026-07-25', expectedYield: 10 },
    // Oignon (semis en pépinière)
    { bed: nord[17], cultivar: 'Oignon Rouge de Florence', sowing: '2026-02-01', status: 'EN_PEPINIERE', qty: 200, expectedHarvest: '2026-07-20', expectedYield: 15 },
    // Fenouil (semis)
    { bed: nord[18], cultivar: 'Fenouil Zefa Fino',       sowing: '2026-03-15', status: 'PLANIFIE', qty: 60, expectedHarvest: '2026-06-30', expectedYield: 7 },
    // Roquette nord
    { bed: nord[19], cultivar: 'Roquette Sauvage',        sowing: '2026-02-20', status: 'EN_CROISSANCE', qty: 100, expectedHarvest: '2026-04-05', expectedYield: 4 },
    // Planches libres (planifiées pour été)
    { bed: nord[20], cultivar: 'Tomate Cœur de Bœuf',    sowing: '2026-05-15', status: 'PLANIFIE', qty: 8, expectedHarvest: '2026-08-01', expectedYield: 14 },
    { bed: nord[21], cultivar: 'Concombre Marketmore',    sowing: '2026-05-01', status: 'PLANIFIE', qty: 6, expectedHarvest: '2026-07-15', expectedYield: 18 },
    { bed: nord[22], cultivar: 'Courgette Black Beauty',  sowing: '2026-05-01', status: 'PLANIFIE', qty: 4, expectedHarvest: '2026-06-25', expectedYield: 22 },

    // === ZONE SUD (10 planches) ===
    // Poireaux tardifs
    { bed: sud[0], cultivar: 'Poireau Bleu de Solaize',         sowing: '2025-07-01', status: 'EN_RECOLTE', qty: 80, expectedHarvest: '2025-12-01', expectedYield: 10 },
    // Mâche sud
    { bed: sud[1], cultivar: 'Mâche Verte de Cambrai',          sowing: '2025-09-15', status: 'EN_RECOLTE', qty: 180, expectedHarvest: '2025-11-15', expectedYield: 5 },
    // Épinards sud
    { bed: sud[2], cultivar: 'Épinard Monstrueux de Viroflay',  sowing: '2026-02-01', status: 'EN_CROISSANCE', qty: 120, expectedHarvest: '2026-04-10', expectedYield: 7 },
    // Carottes
    { bed: sud[3], cultivar: 'Carotte Nantaise',                sowing: '2026-03-08', status: 'SEME', qty: 280, expectedHarvest: '2026-06-25', expectedYield: 11 },
    // Radis
    { bed: sud[4], cultivar: 'Radis de 18 jours',               sowing: '2026-03-12', status: 'SEME', qty: 350, expectedHarvest: '2026-03-30', expectedYield: 4 },
    // Laitues
    { bed: sud[5], cultivar: 'Laitue Merveille 4 Saisons',      sowing: '2026-02-15', status: 'EN_CROISSANCE', qty: 48, expectedHarvest: '2026-04-20', expectedYield: 5 },
    // Betterave
    { bed: sud[6], cultivar: 'Betterave Chioggia',              sowing: '2026-03-05', status: 'SEME', qty: 100, expectedHarvest: '2026-06-20', expectedYield: 9 },
    // Roquette
    { bed: sud[7], cultivar: 'Roquette Sauvage',                sowing: '2026-02-25', status: 'EN_CROISSANCE', qty: 90, expectedHarvest: '2026-04-10', expectedYield: 4 },
    // Fenouil
    { bed: sud[8], cultivar: 'Fenouil Zefa Fino',               sowing: '2026-03-10', status: 'PLANIFIE', qty: 50, expectedHarvest: '2026-07-05', expectedYield: 6 },
    // Libre (planifié haricots)
    { bed: sud[9], cultivar: 'Haricot Beurre de Rocquencourt',  sowing: '2026-05-05', status: 'PLANIFIE', qty: 120, expectedHarvest: '2026-07-20', expectedYield: 7 },
  ];

  console.log('  → Création des plantations...');
  const createdPlantings = [];
  for (const def of plantingDefs) {
    if (!def.bed) { console.warn('  ⚠️  Planche manquante, skip.'); continue; }
    const cultivarId = cultivarMap[def.cultivar];
    if (!cultivarId) { console.warn(`  ⚠️  Cultivar "${def.cultivar}" introuvable, skip.`); continue; }

    const existing = await prisma.planting.findFirst({
      where: { seasonId: saison2026.id, bedId: def.bed.id, cultivarId },
    });
    if (existing) { createdPlantings.push(existing); continue; }

    const p = await prisma.planting.create({
      data: {
        seasonId: saison2026.id,
        bedId: def.bed.id,
        cultivarId,
        sowingDate: new Date(def.sowing),
        quantityPlanted: def.qty,
        status: def.status,
        expectedHarvestDate: def.expectedHarvest ? new Date(def.expectedHarvest) : null,
        expectedYieldKg: def.expectedYield ?? null,
        actualFirstHarvestDate: def.status === 'EN_RECOLTE' ? new Date(def.expectedHarvest) : null,
      },
    });
    createdPlantings.push(p);
  }
  console.log(`  → ${createdPlantings.length} plantations créées`);

  // ---- Récoltes pour les plantations EN_RECOLTE ----
  console.log('  → Création des récoltes...');
  const enRecolte = createdPlantings.filter((_, i) => plantingDefs[i]?.status === 'EN_RECOLTE');

  const harvestData = [
    // Basilic serre
    { kg: 0.8, qualite: 5, notes: 'Basilic très parfumé, belle croissance' },
    { kg: 0.6, qualite: 4, notes: 'Bonne récolte, feuilles tendres' },
    // Laitues serre
    { kg: 2.4, qualite: 5, notes: '40 têtes récoltées ce matin' },
    { kg: 2.1, qualite: 4, notes: '38 têtes, quelques feuilles abîmées par le froid' },
    // Roquette serre
    { kg: 1.2, qualite: 5, notes: 'Très aromatique, belle repousse' },
    // Mâche serre
    { kg: 0.9, qualite: 4, notes: 'Récolte régulière, petites barquettes' },
    // Poireaux nord
    { kg: 8.5, qualite: 5, notes: 'Beaux poireaux, fût blanc long' },
    { kg: 9.0, qualite: 5, notes: 'Excellente qualité' },
    { kg: 7.2, qualite: 4, notes: 'Calibre un peu irrégulier mais bon goût' },
    // Mâche nord
    { kg: 3.8, qualite: 4, notes: '' },
    { kg: 4.1, qualite: 5, notes: 'Très belle mâche, rosettes bien formées' },
    // Poireau sud
    { kg: 7.8, qualite: 4, notes: 'Quelques plants touchés par le gel' },
    // Mâche sud
    { kg: 2.9, qualite: 4, notes: '' },
  ];

  let harvestIdx = 0;
  for (const p of enRecolte) {
    if (harvestIdx >= harvestData.length) break;
    const hd = harvestData[harvestIdx++];
    const existingHarvest = await prisma.harvest.findFirst({ where: { plantingId: p.id } });
    if (!existingHarvest) {
      // Première récolte il y a ~2 semaines
      const harvestDate = new Date('2026-03-05');
      await prisma.harvest.create({
        data: {
          plantingId: p.id,
          date: harvestDate,
          quantityKg: hd.kg,
          qualityRating: hd.qualite,
          notes: hd.notes,
        },
      });
      // Deuxième récolte cette semaine pour certains
      if (hd.qualite >= 4) {
        await prisma.harvest.create({
          data: {
            plantingId: p.id,
            date: new Date('2026-03-17'),
            quantityKg: parseFloat((hd.kg * 0.9).toFixed(2)),
            qualityRating: hd.qualite,
            notes: '2e récolte de la semaine',
          },
        });
      }
    }
  }
  console.log('  → Récoltes créées');

  // ---- Tâches du jour et de la semaine ----
  console.log('  → Création des tâches...');

  // On récupère quelques plantations pour les lier
  const tomateSerre = createdPlantings.find((_, i) => plantingDefs[i]?.cultivar === 'Tomate Cœur de Bœuf' && plantingDefs[i]?.bed?.zone?.name === 'Serre');
  const caroteNord = createdPlantings.find((_, i) => plantingDefs[i]?.cultivar === 'Carotte Nantaise' && plantingDefs[i]?.bed?.zone?.name === 'Zone Nord');
  const laitueNord = createdPlantings.find((_, i) => plantingDefs[i]?.cultivar === 'Laitue Merveille 4 Saisons');
  const poireauNord = createdPlantings.find((_, i) => plantingDefs[i]?.cultivar === 'Poireau Bleu de Solaize' && plantingDefs[i]?.bed?.zone?.name === 'Zone Nord');

  const taskDefs = [
    // Aujourd'hui (19 mars 2026)
    { name: 'Arrosage pépinière tomates', scheduledDate: '2026-03-19', priority: 'HAUTE', status: 'A_FAIRE', plantingId: tomateSerre?.id, notes: 'Maintenir humidité constante, vérifier température serre' },
    { name: 'Récolte laitues serre', scheduledDate: '2026-03-19', priority: 'HAUTE', status: 'A_FAIRE', notes: 'Récolter planches Serre-10 et Serre-11' },
    { name: 'Désherbage Zone Nord', scheduledDate: '2026-03-19', priority: 'NORMALE', status: 'A_FAIRE', notes: 'Planches Nord-01 à Nord-05' },
    { name: 'Semis radis Zone Sud', scheduledDate: '2026-03-19', priority: 'NORMALE', status: 'A_FAIRE', notes: 'Planche Sud-05 prête, substrat préparé' },
    // Demain
    { name: 'Repiquage laitues en chassis', scheduledDate: '2026-03-20', priority: 'HAUTE', status: 'A_FAIRE', plantingId: laitueNord?.id, notes: 'Plantes prêtes, planche préparée' },
    { name: 'Fertilisation poireaux', scheduledDate: '2026-03-20', priority: 'NORMALE', status: 'A_FAIRE', plantingId: poireauNord?.id, notes: 'Apport compost décomposé 2kg/m²' },
    { name: 'Binage carottes', scheduledDate: '2026-03-20', priority: 'BASSE', status: 'A_FAIRE', plantingId: caroteNord?.id, notes: 'Désherbage mécanique entre les rangs' },
    // Cette semaine
    { name: 'Traitement pucerons serre', scheduledDate: '2026-03-21', priority: 'URGENTE', status: 'A_FAIRE', notes: 'Présence de pucerons sur basilic — savon noir dilué' },
    { name: 'Récolte roquette serre', scheduledDate: '2026-03-21', priority: 'NORMALE', status: 'A_FAIRE', notes: 'Serre-13, 3e coupe' },
    { name: 'Préparation planches été (Nord-21 à 23)', scheduledDate: '2026-03-22', priority: 'NORMALE', status: 'A_FAIRE', notes: 'Labour léger et apport de compost' },
    { name: 'Contrôle germination carottes', scheduledDate: '2026-03-23', priority: 'BASSE', status: 'A_FAIRE', notes: 'Vérifier levée Nord-06 et Nord-07' },
    // En retard
    { name: 'Entretien serre — nettoyage vitres', scheduledDate: '2026-03-10', priority: 'BASSE', status: 'A_FAIRE', notes: 'En attente depuis 2 semaines' },
    { name: 'Commande graines été', scheduledDate: '2026-03-12', priority: 'HAUTE', status: 'A_FAIRE', notes: 'Tomates, courgettes, haricots — voir liste fournisseur' },
    // Tâches terminées (historique)
    { name: 'Semis tomates en pépinière', scheduledDate: '2026-01-20', priority: 'HAUTE', status: 'FAIT', notes: 'Semis réalisés, taux de germination 92%' },
    { name: 'Désinfection serre après hiver', scheduledDate: '2026-01-05', priority: 'NORMALE', status: 'FAIT', notes: 'Soufre mouillable, repos 5 jours' },
    { name: 'Semis basilic serre', scheduledDate: '2026-01-10', priority: 'NORMALE', status: 'FAIT', notes: 'Serre-08 et Serre-09, germination 5 jours' },
    { name: 'Repiquage épinards Zone Nord', scheduledDate: '2026-01-25', priority: 'NORMALE', status: 'FAIT', notes: 'Planches Nord-04 et Nord-05 repiquées' },
  ];

  for (const def of taskDefs) {
    const existing = await prisma.task.findFirst({
      where: { name: def.name, scheduledDate: new Date(def.scheduledDate) },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          name: def.name,
          scheduledDate: new Date(def.scheduledDate),
          priority: def.priority,
          status: def.status,
          description: def.notes,
          plantingId: def.plantingId || null,
          completedDate: def.status === 'FAIT' ? new Date(def.scheduledDate) : null,
        },
      });
    }
  }
  console.log('  → Tâches créées');

  // ---- Lots de pépinière ----
  console.log('  → Création des lots de pépinière...');
  const pepiniereDefs = [
    { cultivar: 'Tomate Cœur de Bœuf',   sowing: '2026-01-20', containerType: 'ALVEOLES_60', containerCount: 3, cellsPerContainer: 60, status: 'PRET_AU_REPIQUAGE', expectedTransplant: '2026-04-15' },
    { cultivar: 'Tomate Noire de Crimée', sowing: '2026-01-20', containerType: 'ALVEOLES_60', containerCount: 3, cellsPerContainer: 60, status: 'PRET_AU_REPIQUAGE', expectedTransplant: '2026-04-15' },
    { cultivar: 'Tomate Ananas',          sowing: '2026-01-22', containerType: 'ALVEOLES_60', containerCount: 2, cellsPerContainer: 60, status: 'EN_CROISSANCE', expectedTransplant: '2026-04-20' },
    { cultivar: 'Tomate Green Zebra',     sowing: '2026-01-22', containerType: 'ALVEOLES_60', containerCount: 2, cellsPerContainer: 60, status: 'EN_CROISSANCE', expectedTransplant: '2026-04-20' },
    { cultivar: 'Concombre Marketmore',   sowing: '2026-02-15', containerType: 'ALVEOLES_40', containerCount: 2, cellsPerContainer: 40, status: 'EN_CROISSANCE', expectedTransplant: '2026-04-10' },
    { cultivar: 'Laitue Merveille 4 Saisons', sowing: '2026-02-10', containerType: 'ALVEOLES_104', containerCount: 1, cellsPerContainer: 104, status: 'PRET_AU_REPIQUAGE', expectedTransplant: '2026-03-20' },
    { cultivar: 'Laitue Batavia Rouge',   sowing: '2026-02-10', containerType: 'ALVEOLES_104', containerCount: 1, cellsPerContainer: 104, status: 'PRET_AU_REPIQUAGE', expectedTransplant: '2026-03-20' },
    { cultivar: 'Oignon Rouge de Florence', sowing: '2026-02-01', containerType: 'CAISSETTE', containerCount: 4, cellsPerContainer: 50, status: 'EN_CROISSANCE', expectedTransplant: '2026-04-05' },
    { cultivar: 'Courgette Black Beauty', sowing: '2026-03-01', containerType: 'POT_10CM', containerCount: 8, cellsPerContainer: 1, status: 'EN_GERMINATION', expectedTransplant: '2026-05-05' },
  ];

  for (const def of pepiniereDefs) {
    const cultivarId = cultivarMap[def.cultivar];
    if (!cultivarId) continue;
    const planting = createdPlantings.find((_, i) => plantingDefs[i]?.cultivar === def.cultivar);
    const existing = await prisma.nurseryBatch.findFirst({ where: { cultivarId, sowingDate: new Date(def.sowing) } });
    if (!existing) {
      await prisma.nurseryBatch.create({
        data: {
          cultivarId,
          plantingId: planting?.id || createdPlantings[0].id,
          sowingDate: new Date(def.sowing),
          containerType: def.containerType,
          containerCount: def.containerCount,
          cellsPerContainer: def.cellsPerContainer,
          totalSeedsSown: def.containerCount * def.cellsPerContainer,
          germinationCount: Math.floor(def.containerCount * def.cellsPerContainer * 0.9),
          germinationRate: 90.0,
          plantsReady: def.status === 'PRET_AU_REPIQUAGE' ? Math.floor(def.containerCount * def.cellsPerContainer * 0.85) : null,
          status: def.status,
          expectedTransplantDate: new Date(def.expectedTransplant),
        },
      });
    }
  }
  console.log('  → Lots pépinière créés');

  // ---- Entrées journal ----
  console.log('  → Création du journal...');
  const user = await prisma.user.findFirst();
  const journalEntries = [
    { date: '2026-03-17', content: 'Belle journée ensoleillée, 12°C. Récolte des laitues et de la roquette de serre. Les tomates en pépinière montrent de belles feuilles vraies — prêtes pour un premier rempotage la semaine prochaine. Observation de quelques pucerons sur le basilic pourpre, à surveiller.', tags: ['récolte', 'pépinière', 'ravageurs'] },
    { date: '2026-03-14', content: 'Gel léger cette nuit (-2°C). Les mâches et poireaux n\'ont pas souffert. Binage des carottes en cours. Préparation du compost pour les planches d\'été.', tags: ['météo', 'gel', 'binage'] },
    { date: '2026-03-10', content: 'Semis de carottes Nantaise sur Nord-06 et Nord-07. Sol bien préparé, légèrement humide. Premier semis de radis sur Sud-05 en retard d\'une semaine à cause des pluies.', tags: ['semis', 'carottes', 'radis'] },
    { date: '2026-03-05', content: 'Grande récolte de poireaux Zone Nord (planches 01, 02, 03). Calibre excellent cette saison. Environ 25 kg récoltés. Livraison au service traiteur demain matin. Les laitues de serre arrivent à maturité — début des récoltes progressives.', tags: ['récolte', 'poireaux', 'traiteur'] },
    { date: '2026-02-28', content: 'Installation des nouveaux chassis sur la Zone Nord pour avancer les laitues de printemps. Semis de betteraves Chioggia et Crapaudine en planche. Taux de germination des oignons en pépinière : 88%.', tags: ['chassis', 'semis', 'betteraves', 'pépinière'] },
  ];

  for (const je of journalEntries) {
    const existing = await prisma.journalEntry.findFirst({ where: { date: new Date(je.date), userId: user.id } });
    if (!existing) {
      await prisma.journalEntry.create({
        data: {
          userId: user.id,
          date: new Date(je.date),
          content: je.content,
          tags: JSON.stringify(je.tags),
        },
      });
    }
  }
  console.log('  → Journal créé');

  console.log('');
  console.log('✅ Seed saison 2026 terminé !');
  console.log(`   Saison  : ${saison2026.name}`);
  console.log(`   Cultivars : ${Object.keys(cultivarMap).length}`);
  console.log(`   Plantations : ${createdPlantings.length}`);
  console.log(`   Zones : Serre (${serre.length}), Nord (${nord.length}), Sud (${sud.length})`);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
