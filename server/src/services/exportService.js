// ============================================================
// Service Export — CSV, XLSX, PDF
// ============================================================

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const { fr } = require('date-fns/locale');

// Formater une date FR
const formatDate = (date) => {
  if (!date) return '';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return String(date);
  }
};

// Formater un nombre décimal
const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '';
  return parseFloat(num).toFixed(decimals);
};

// ---- Colonnes par entité ----

const COLUMNS = {
  plantings: [
    { header: 'Saison', key: 'season', width: 20 },
    { header: 'Planche', key: 'bed', width: 15 },
    { header: 'Zone', key: 'zone', width: 15 },
    { header: 'Cultivar', key: 'cultivar', width: 25 },
    { header: 'Espèce', key: 'species', width: 20 },
    { header: 'Famille', key: 'family', width: 20 },
    { header: 'Date de semis', key: 'sowingDate', width: 15 },
    { header: 'Date de transplantation', key: 'transplantDate', width: 20 },
    { header: 'Récolte prévue', key: 'expectedHarvestDate', width: 15 },
    { header: 'Statut', key: 'status', width: 15 },
    { header: 'Quantité plantée', key: 'quantityPlanted', width: 15 },
    { header: 'Rendement prévu (kg)', key: 'expectedYieldKg', width: 18 },
    { header: 'Notes', key: 'notes', width: 40 },
  ],
  harvests: [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Cultivar', key: 'cultivar', width: 25 },
    { header: 'Planche', key: 'bed', width: 15 },
    { header: 'Saison', key: 'season', width: 20 },
    { header: 'Quantité (kg)', key: 'quantityKg', width: 15 },
    { header: 'Qualité (1-5)', key: 'qualityRating', width: 15 },
    { header: 'Notes', key: 'notes', width: 40 },
  ],
  tasks: [
    { header: 'Nom', key: 'name', width: 30 },
    { header: 'Date planifiée', key: 'scheduledDate', width: 15 },
    { header: 'Date réalisée', key: 'completedDate', width: 15 },
    { header: 'Statut', key: 'status', width: 15 },
    { header: 'Priorité', key: 'priority', width: 10 },
    { header: 'Plantation', key: 'planting', width: 25 },
    { header: 'Planche', key: 'bed', width: 15 },
    { header: 'Zone', key: 'zone', width: 15 },
    { header: 'Durée estimée (h)', key: 'estimatedDuration', width: 18 },
    { header: 'Durée réelle (h)', key: 'actualDuration', width: 15 },
  ],
  seeds: [
    { header: 'Cultivar', key: 'cultivar', width: 25 },
    { header: 'Espèce', key: 'species', width: 20 },
    { header: 'Fournisseur', key: 'supplier', width: 25 },
    { header: 'N° de lot', key: 'lotNumber', width: 15 },
    { header: 'Quantité initiale', key: 'initialQuantity', width: 15 },
    { header: 'Stock restant', key: 'quantityInStock', width: 15 },
    { header: 'Prix unitaire (€)', key: 'unitPrice', width: 15 },
    { header: "Date d'achat", key: 'purchaseDate', width: 15 },
    { header: "Date d'expiration", key: 'expiryDate', width: 15 },
    { header: 'Notes', key: 'notes', width: 40 },
  ],
  weather: [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Temp. max (°C)', key: 'temperatureMax', width: 15 },
    { header: 'Temp. min (°C)', key: 'temperatureMin', width: 15 },
    { header: 'Temp. moy. (°C)', key: 'temperatureAvg', width: 15 },
    { header: 'Précipitations (mm)', key: 'precipitationMm', width: 18 },
    { header: 'Vent max (km/h)', key: 'windSpeedMaxKmh', width: 15 },
    { header: 'Humidité moy. (%)', key: 'humidityAvg', width: 15 },
    { header: 'Ensoleillement (h)', key: 'sunshineHours', width: 18 },
    { header: 'Gel', key: 'frost', width: 10 },
  ],
  nursery: [
    { header: 'Cultivar', key: 'cultivar', width: 25 },
    { header: 'Date de semis', key: 'sowingDate', width: 15 },
    { header: 'Type de contenant', key: 'containerType', width: 20 },
    { header: 'Nb contenants', key: 'containerCount', width: 15 },
    { header: 'Graines semées', key: 'totalSeedsSown', width: 15 },
    { header: 'Germination (%)', key: 'germinationRate', width: 15 },
    { header: 'Plants prêts', key: 'plantsReady', width: 12 },
    { header: 'Transplantation prévue', key: 'expectedTransplantDate', width: 20 },
    { header: 'Transplantation réelle', key: 'actualTransplantDate', width: 20 },
    { header: 'Statut', key: 'status', width: 20 },
  ],
};

// ---- Convertisseurs de données ----

const mapPlanting = (p) => ({
  season: p.season?.name || '',
  bed: p.bed?.name || '',
  zone: p.bed?.zone?.name || '',
  cultivar: p.cultivar?.name || '',
  species: p.cultivar?.species?.name || '',
  family: p.cultivar?.species?.family || '',
  sowingDate: formatDate(p.sowingDate),
  transplantDate: formatDate(p.transplantDate),
  expectedHarvestDate: formatDate(p.expectedHarvestDate),
  status: p.status,
  quantityPlanted: p.quantityPlanted,
  expectedYieldKg: formatNumber(p.expectedYieldKg),
  notes: p.notes || '',
});

const mapHarvest = (h) => ({
  date: formatDate(h.date),
  cultivar: h.planting?.cultivar?.name || '',
  bed: h.planting?.bed?.name || '',
  season: h.planting?.season?.name || '',
  quantityKg: formatNumber(h.quantityKg),
  qualityRating: h.qualityRating || '',
  notes: h.notes || '',
});

const mapTask = (t) => ({
  name: t.name,
  scheduledDate: formatDate(t.scheduledDate),
  completedDate: formatDate(t.completedDate),
  status: t.status,
  priority: t.priority,
  planting: t.planting ? `${t.planting.cultivar?.name} — ${t.planting.bed?.name}` : '',
  bed: t.bed?.name || '',
  zone: t.zone?.name || t.bed?.zone?.name || '',
  estimatedDuration: t.taskTemplate?.minutesPerM2 ? formatNumber(t.taskTemplate.minutesPerM2) + ' min/m²' : '',
  actualDuration: formatNumber(t.actualDurationHours),
});

const mapSeed = (s) => ({
  cultivar: s.cultivar?.name || '',
  species: s.cultivar?.species?.name || '',
  supplier: s.supplier,
  lotNumber: s.lotNumber || '',
  initialQuantity: s.initialQuantity ?? '',
  quantityInStock: formatNumber(s.quantityInStock),
  unitPrice: formatNumber(s.unitPriceEuros),
  purchaseDate: formatDate(s.purchaseDate),
  expiryDate: formatDate(s.expiryDate),
  notes: s.notes || '',
});

const mapWeather = (w) => ({
  date: formatDate(w.date),
  temperatureMax: formatNumber(w.temperatureMax, 1),
  temperatureMin: formatNumber(w.temperatureMin, 1),
  temperatureAvg: formatNumber(w.temperatureAvg, 1),
  precipitationMm: formatNumber(w.precipitationMm, 1),
  windSpeedMaxKmh: formatNumber(w.windSpeedMaxKmh, 1),
  humidityAvg: formatNumber(w.humidityAvg, 1),
  sunshineHours: formatNumber(w.sunshineHours, 1),
  frost: w.frost ? 'Oui' : 'Non',
});

const mapNursery = (n) => ({
  cultivar: n.cultivar?.name || '',
  sowingDate: formatDate(n.sowingDate),
  containerType: n.containerType,
  containerCount: n.containerCount,
  totalSeedsSown: n.totalSeedsSown,
  germinationRate: formatNumber(n.germinationRate, 1),
  plantsReady: n.plantsReady || '',
  expectedTransplantDate: formatDate(n.expectedTransplantDate),
  actualTransplantDate: formatDate(n.actualTransplantDate),
  status: n.status,
});

const MAPPERS = {
  plantings: mapPlanting,
  harvests: mapHarvest,
  tasks: mapTask,
  seeds: mapSeed,
  weather: mapWeather,
  nursery: mapNursery,
};

// ---- Export CSV ----

/**
 * Génère un CSV avec BOM UTF-8 (pour compatibilité Excel)
 */
const exportCSV = (entity, data) => {
  const columns = COLUMNS[entity];
  const mapper = MAPPERS[entity];

  // En-têtes
  const headers = columns.map((c) => `"${c.header}"`).join(';');

  // Lignes
  const rows = data.map((item) => {
    const mapped = mapper(item);
    return columns.map((c) => `"${String(mapped[c.key] || '').replace(/"/g, '""')}"`).join(';');
  });

  // BOM UTF-8 + contenu
  return '\uFEFF' + [headers, ...rows].join('\n');
};

// ---- Export XLSX ----

/**
 * Génère un fichier Excel avec mise en forme
 */
const exportXLSX = async (entity, data, title) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MalaMaraichageApp';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(title || entity, {
    pageSetup: { fitToPage: true, fitToWidth: 1 },
  });

  const columns = COLUMNS[entity];
  const mapper = MAPPERS[entity];

  // Définir les colonnes
  worksheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Style de l'en-tête
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B5E20' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 22;

  // Ajouter les données
  data.forEach((item) => {
    const mapped = mapper(item);
    worksheet.addRow(mapped);
  });

  // Zebra striping (lignes alternées)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      };
    }
  });

  // Figer la première ligne
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
};

// ---- Export PDF ----

/**
 * Génère un PDF simple (liste tabulaire)
 */
const exportPDF = (entity, data, title, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  // Pipe vers la réponse
  doc.pipe(res);

  // Police et titre
  doc.fontSize(16).font('Helvetica-Bold').text(title || entity, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(
    `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
    { align: 'center' }
  );
  doc.moveDown();

  const columns = COLUMNS[entity];
  const mapper = MAPPERS[entity];

  // Dimensions
  const pageWidth = doc.page.width - 80;
  const colWidth = Math.floor(pageWidth / Math.min(columns.length, 8));
  const visibleCols = columns.slice(0, 8); // Limiter à 8 colonnes pour PDF

  // En-tête du tableau
  let x = 40;
  const headerY = doc.y;
  doc.fillColor('#1B5E20').fontSize(8).font('Helvetica-Bold');
  visibleCols.forEach((col) => {
    doc.text(col.header, x, headerY, { width: colWidth, ellipsis: true });
    x += colWidth;
  });
  doc.moveDown(0.5);
  doc.strokeColor('#1B5E20').lineWidth(1).moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
  doc.moveDown(0.3);

  // Lignes de données
  doc.fillColor('#333333').fontSize(7).font('Helvetica');
  data.forEach((item, index) => {
    const mapped = mapper(item);
    x = 40;
    const rowY = doc.y;

    // Fond alterné
    if (index % 2 === 0) {
      doc.fillColor('#F5F5F5').rect(40, rowY - 2, pageWidth, 14).fill();
      doc.fillColor('#333333');
    }

    visibleCols.forEach((col) => {
      doc.text(String(mapped[col.key] || ''), x, rowY, { width: colWidth, ellipsis: true });
      x += colWidth;
    });
    doc.moveDown(0.6);

    // Nouvelle page si nécessaire
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
    }
  });

  doc.end();
};

module.exports = { exportCSV, exportXLSX, exportPDF };
