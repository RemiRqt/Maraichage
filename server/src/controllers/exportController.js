// Contrôleur pour l'export des données en CSV, XLSX ou PDF
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { generatePDF } = require('../services/pdfReportService');

// --- Définition des colonnes par entité ---

const COLONNES = {
  plantings: [
    { header: 'ID', key: 'id' },
    { header: 'Saison', key: 'season' },
    { header: 'Planche', key: 'bed' },
    { header: 'Zone', key: 'zone' },
    { header: 'Cultivar', key: 'cultivar' },
    { header: 'Espèce', key: 'species' },
    { header: 'Statut', key: 'status' },
    { header: 'Date de semis', key: 'sowingDate' },
    { header: 'Date de transplantation', key: 'transplantDate' },
    { header: 'Date de récolte prévue', key: 'expectedHarvestDate' },
    { header: 'Rendement prévu (kg)', key: 'expectedYieldKg' },
    { header: 'Notes', key: 'notes' },
  ],
  harvests: [
    { header: 'ID', key: 'id' },
    { header: 'Date de récolte', key: 'date' },
    { header: 'Cultivar', key: 'cultivar' },
    { header: 'Planche', key: 'bed' },
    { header: 'Saison', key: 'season' },
    { header: 'Quantité (kg)', key: 'quantityKg' },
    { header: 'Note qualité', key: 'qualityRating' },
    { header: 'Notes', key: 'notes' },
  ],
  tasks: [
    { header: 'ID', key: 'id' },
    { header: 'Nom', key: 'name' },
    { header: 'Statut', key: 'status' },
    { header: 'Priorité', key: 'priority' },
    { header: 'Date planifiée', key: 'scheduledDate' },
    { header: 'Date réalisée', key: 'completedDate' },
    { header: 'Durée réelle (h)', key: 'actualDurationHours' },
    { header: 'Planche', key: 'bed' },
    { header: 'Cultivar', key: 'cultivar' },
  ],
  seeds: [
    { header: 'ID', key: 'id' },
    { header: 'Cultivar', key: 'cultivar' },
    { header: 'Espèce', key: 'species' },
    { header: 'Quantité initiale', key: 'initialQuantity' },
    { header: 'Quantité en stock', key: 'quantityInStock' },
    { header: 'Fournisseur', key: 'supplier' },
    { header: 'Numéro de lot', key: 'lotNumber' },
    { header: "Date d'achat", key: 'purchaseDate' },
    { header: "Date d'expiration", key: 'expiryDate' },
  ],
  weather: [
    { header: 'Date', key: 'date' },
    { header: 'Temp. max (°C)', key: 'temperatureMax' },
    { header: 'Temp. min (°C)', key: 'temperatureMin' },
    { header: 'Temp. moy (°C)', key: 'temperatureAvg' },
    { header: 'Précipitations (mm)', key: 'precipitationMm' },
    { header: 'Vent max (km/h)', key: 'windSpeedMaxKmh' },
    { header: 'Humidité moy. (%)', key: 'humidityAvg' },
    { header: 'Ensoleillement (h)', key: 'sunshineHours' },
    { header: 'Gel', key: 'frost' },
  ],
  nursery: [
    { header: 'ID', key: 'id' },
    { header: 'Cultivar', key: 'cultivar' },
    { header: 'Statut', key: 'status' },
    { header: 'Date de semis', key: 'sowingDate' },
    { header: 'Type conteneur', key: 'containerType' },
    { header: 'Nb conteneurs', key: 'containerCount' },
    { header: 'Alvéoles/conteneur', key: 'cellsPerContainer' },
    { header: 'Total graines semées', key: 'totalSeedsSown' },
    { header: 'Nb germinations', key: 'germinationCount' },
    { header: 'Taux de germination (%)', key: 'germinationRate' },
    { header: 'Date repiquage prévue', key: 'expectedTransplantDate' },
    { header: 'Date repiquage réelle', key: 'actualTransplantDate' },
  ],
};

// --- Récupération des données par entité ---

async function fetchData(entity, seasonId) {
  switch (entity) {
    case 'plantings': {
      const rows = await prisma.planting.findMany({
        where: seasonId ? { seasonId } : {},
        include: {
          season: true,
          bed: { include: { zone: true } },
          cultivar: { include: { species: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map((r) => ({
        id: r.id,
        season: r.season?.name || '',
        bed: r.bed?.name || '',
        zone: r.bed?.zone?.name || '',
        cultivar: r.cultivar?.name || '',
        species: r.cultivar?.species?.name || '',
        status: r.status,
        sowingDate: r.sowingDate ? r.sowingDate.toISOString().split('T')[0] : '',
        transplantDate: r.transplantDate ? r.transplantDate.toISOString().split('T')[0] : '',
        expectedHarvestDate: r.expectedHarvestDate ? r.expectedHarvestDate.toISOString().split('T')[0] : '',
        expectedYieldKg: r.expectedYieldKg ?? '',
        notes: r.notes || '',
      }));
    }

    case 'harvests': {
      const rows = await prisma.harvest.findMany({
        where: seasonId ? { planting: { seasonId } } : {},
        include: {
          planting: {
            include: {
              cultivar: true,
              bed: true,
              season: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });
      return rows.map((r) => ({
        id: r.id,
        date: r.date ? r.date.toISOString().split('T')[0] : '',
        cultivar: r.planting?.cultivar?.name || '',
        bed: r.planting?.bed?.name || '',
        season: r.planting?.season?.name || '',
        quantityKg: r.quantityKg ?? '',
        qualityRating: r.qualityRating ?? '',
        notes: r.notes || '',
      }));
    }

    case 'tasks': {
      const rows = await prisma.task.findMany({
        where: seasonId ? { planting: { seasonId } } : {},
        include: {
          planting: { include: { cultivar: true } },
          bed: true,
        },
        orderBy: { scheduledDate: 'asc' },
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        priority: r.priority,
        scheduledDate: r.scheduledDate ? r.scheduledDate.toISOString().split('T')[0] : '',
        completedDate: r.completedDate ? r.completedDate.toISOString().split('T')[0] : '',
        actualDurationHours: r.actualDurationHours ?? '',
        bed: r.bed?.name || '',
        cultivar: r.planting?.cultivar?.name || '',
      }));
    }

    case 'seeds': {
      const rows = await prisma.seedInventory.findMany({
        include: {
          cultivar: { include: { species: true } },
        },
        orderBy: { cultivar: { name: 'asc' } },
      });
      return rows.map((r) => ({
        id: r.id,
        cultivar: r.cultivar?.name || '',
        species: r.cultivar?.species?.name || '',
        initialQuantity: r.initialQuantity ?? '',
        quantityInStock: r.quantityInStock ?? '',
        supplier: r.supplier || '',
        lotNumber: r.lotNumber || '',
        purchaseDate: r.purchaseDate ? r.purchaseDate.toISOString().split('T')[0] : '',
        expiryDate: r.expiryDate ? r.expiryDate.toISOString().split('T')[0] : '',
      }));
    }

    case 'weather': {
      const rows = await prisma.weatherData.findMany({
        orderBy: { date: 'desc' },
      });
      return rows.map((r) => ({
        date: r.date ? r.date.toISOString().split('T')[0] : '',
        temperatureMax: r.temperatureMax ?? '',
        temperatureMin: r.temperatureMin ?? '',
        temperatureAvg: r.temperatureAvg ?? '',
        precipitationMm: r.precipitationMm ?? '',
        windSpeedMaxKmh: r.windSpeedMaxKmh ?? '',
        humidityAvg: r.humidityAvg ?? '',
        sunshineHours: r.sunshineHours ?? '',
        frost: r.frost ?? '',
      }));
    }

    case 'nursery': {
      const rows = await prisma.nurseryBatch.findMany({
        include: {
          cultivar: true,
        },
        orderBy: { sowingDate: 'desc' },
      });
      return rows.map((r) => ({
        id: r.id,
        cultivar: r.cultivar?.name || '',
        status: r.status,
        sowingDate: r.sowingDate ? r.sowingDate.toISOString().split('T')[0] : '',
        containerType: r.containerType ?? '',
        containerCount: r.containerCount ?? '',
        cellsPerContainer: r.cellsPerContainer ?? '',
        totalSeedsSown: r.totalSeedsSown ?? '',
        germinationCount: r.germinationCount ?? '',
        germinationRate: r.germinationRate ?? '',
        expectedTransplantDate: r.expectedTransplantDate ? r.expectedTransplantDate.toISOString().split('T')[0] : '',
        actualTransplantDate: r.actualTransplantDate ? r.actualTransplantDate.toISOString().split('T')[0] : '',
      }));
    }

    default:
      return [];
  }
}

// --- Utilitaire CSV ---

function convertirEnCsv(data, colonnes) {
  const entetes = colonnes.map((c) => `"${c.header}"`).join(';');
  const lignes = data.map((row) =>
    colonnes.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(';')
  );
  return '\uFEFF' + [entetes, ...lignes].join('\r\n'); // BOM UTF-8 pour Excel
}

// --- Contrôleur principal ---

// GET /:entity — Exporte les données selon l'entité et le format
const exportData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { entity } = req.params;
    const { format = 'csv', season_id } = req.query;

    const colonnes = COLONNES[entity];
    if (!colonnes) {
      return res.status(400).json({ message: `Entité '${entity}' non supportée.` });
    }

    // Récupération des données
    const data = await fetchData(entity, season_id || null);

    const nomFichier = `${entity}_${new Date().toISOString().split('T')[0]}`;

    // --- Export CSV ---
    if (format === 'csv') {
      const csv = convertirEnCsv(data, colonnes);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}.csv"`);
      return res.send(csv);
    }

    // --- Export XLSX ---
    if (format === 'xlsx') {
      let ExcelJS;
      try {
        ExcelJS = require('exceljs');
      } catch {
        return res.status(500).json({ message: 'Le module exceljs est requis pour ce format.' });
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MalaMaraichageApp';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(entity, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      // Colonnes avec largeur auto selon contenu
      worksheet.columns = colonnes.map((c) => ({
        header: c.header,
        key: c.key,
        width: Math.max(c.header.length + 4, 16),
      }));

      // Style en-tête vert
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 22;

      // Ajouter les données avec fond alterné
      data.forEach((row, idx) => {
        const r = worksheet.addRow(row);
        if (idx % 2 === 0) {
          r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } };
        }
        r.alignment = { vertical: 'middle' };
      });

      // Bordure sur toutes les cellules
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}.xlsx"`);

      await workbook.xlsx.write(res);
      return res.end();
    }

    // --- Export PDF ---
    if (format === 'pdf') {
      let PDFDocument;
      try { PDFDocument = require('pdfkit'); } catch {
        return res.status(500).json({ message: 'Le module pdfkit est requis pour ce format.' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true });
      doc.pipe(res);
      generatePDF(entity, data, colonnes, doc);
      doc.end();
      return;
    }

    return res.status(400).json({ message: `Format '${format}' non supporté.` });
  } catch (err) {
    next(err);
  }
};

module.exports = { exportData };
