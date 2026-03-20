// ================================================================
// Service de génération PDF — Rapports enrichis MalaMaraichageApp
// PDFKit uniquement (pas de dépendance canvas/puppeteer)
// ================================================================

const C = {
  green:      '#1B5E20',
  greenMed:   '#4CAF50',
  greenLight: '#E8F5E9',
  yellow:     '#F9A825',
  red:        '#C62828',
  blue:       '#1565C0',
  gray:       '#757575',
  border:     '#E0E0E0',
  white:      '#FFFFFF',
  text:       '#212121',
  textLight:  '#9E9E9E',
  bgAlt:      '#F6FBF6',
};

const PAGE_W  = 841.89;  // A4 paysage
const PAGE_H  = 595.28;
const MARGIN  = 35;
const CONT_W  = PAGE_W - MARGIN * 2;

// ---- Utilitaires ------------------------------------------------

const toNum = (v) => parseFloat(v) || 0;
const pct   = (part, total) => total === 0 ? 0 : Math.round((part / total) * 100);

// ---- Composants de mise en page ---------------------------------

function drawHeader(doc, title, subtitle) {
  doc.rect(0, 0, PAGE_W, 52).fill(C.green);

  // Barre décorative droite
  doc.rect(PAGE_W - 8, 0, 8, 52).fill('#4CAF50');

  doc.fontSize(15).font('Helvetica-Bold').fillColor(C.white)
    .text(title, MARGIN, 11, { width: CONT_W - 130, lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor('#A5D6A7')
    .text(subtitle, MARGIN, 31, { width: CONT_W - 130, lineBreak: false });

  doc.fontSize(7.5).fillColor('#C8E6C9')
    .text(
      new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      MARGIN, 20, { width: CONT_W, align: 'right', lineBreak: false }
    );
}

function drawFooter(doc, text) {
  const y = PAGE_H - 22;
  doc.moveTo(MARGIN, y - 5).lineTo(PAGE_W - MARGIN, y - 5)
    .strokeColor(C.border).lineWidth(0.4).stroke();
  doc.fontSize(6.5).font('Helvetica').fillColor(C.textLight)
    .text('MalaMaraichage — Exploitation maraichere Mormant (77720)', MARGIN, y, { lineBreak: false })
    .text(text, MARGIN, y, { width: CONT_W, align: 'right', lineBreak: false });
}

function drawKPI(doc, x, y, w, label, value, sub, color) {
  const H = 62;
  doc.fillColor(C.white).roundedRect(x, y, w, H, 4).fill();
  doc.strokeColor(C.border).lineWidth(0.5).roundedRect(x, y, w, H, 4).stroke();
  doc.fillColor(color).rect(x, y, 5, H).fill();
  doc.fontSize(20).font('Helvetica-Bold').fillColor(color)
    .text(String(value), x + 14, y + 8, { width: w - 20, lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.gray)
    .text(label, x + 14, y + 34, { width: w - 20, lineBreak: false });
  if (sub) {
    doc.fontSize(6.5).fillColor(C.textLight)
      .text(sub, x + 14, y + 47, { width: w - 20, lineBreak: false });
  }
}

function drawSectionTitle(doc, text, y) {
  doc.fillColor(C.green).rect(MARGIN, y, 4, 15).fill();
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.green)
    .text(text, MARGIN + 10, y + 2, { lineBreak: false });
  return y + 21;
}

// ---- Graphique barres verticales --------------------------------

function drawBarChart(doc, x, y, width, height, items, fmtVal) {
  if (!items || items.length === 0) {
    doc.fontSize(8).fillColor(C.textLight).text('Aucune donnee', x, y + height / 2, { width });
    return;
  }

  const maxVal = Math.max(...items.map(i => i.value), 1);
  const chartH  = height - 28;
  const barW    = Math.min(Math.floor((width - 25) / items.length) - 5, 38);
  const step    = barW + 5;
  const totalW  = items.length * step - 5;
  const startX  = x + 22 + Math.floor(((width - 22) - totalW) / 2);

  // Grille horizontale
  [0.25, 0.5, 0.75, 1].forEach(ratio => {
    const gy = y + chartH - ratio * chartH;
    doc.moveTo(x + 22, gy).lineTo(x + width, gy)
      .strokeColor(C.border).lineWidth(0.3).dash(2, { space: 2 }).stroke().undash();
    doc.fontSize(5.5).font('Helvetica').fillColor(C.textLight)
      .text((maxVal * ratio).toFixed(0), x, gy - 4, { width: 20, align: 'right', lineBreak: false });
  });

  // Axe X
  doc.moveTo(x + 22, y + chartH).lineTo(x + width, y + chartH)
    .strokeColor('#AAAAAA').lineWidth(0.8).stroke();

  // Barres
  items.forEach((item, idx) => {
    const bx = startX + idx * step;
    const bh = Math.max(chartH * (item.value / maxVal), 2);
    const by = y + chartH - bh;
    const color = item.color || C.greenMed;

    doc.fillColor(color).roundedRect(bx, by, barW, bh, 2).fill();

    // Valeur au-dessus
    const valStr = fmtVal ? fmtVal(item.value) : String(item.value);
    doc.fontSize(5.5).font('Helvetica-Bold').fillColor(C.green)
      .text(valStr, bx - 4, by - 9, { width: barW + 8, align: 'center', lineBreak: false });

    // Label en dessous
    const lbl = item.label.length > 11 ? item.label.slice(0, 10) + '.' : item.label;
    doc.fontSize(5.5).font('Helvetica').fillColor(C.textLight)
      .text(lbl, bx - 4, y + chartH + 4, { width: barW + 8, align: 'center', lineBreak: false });
  });
}

// ---- Barre de progression horizontale ---------------------------

function drawHBar(doc, x, y, width, ratio, valLabel, rowLabel, color) {
  const H       = 14;
  const labelW  = 130;
  const valW    = 55;
  const barW    = width - labelW - valW - 8;

  doc.fontSize(7.5).font('Helvetica').fillColor(C.text)
    .text(rowLabel, x, y + 2, { width: labelW, lineBreak: false, ellipsis: true });

  doc.fillColor('#EEEEEE').roundedRect(x + labelW, y, barW, H, 3).fill();
  const fill = Math.max(barW * Math.min(ratio, 1), ratio > 0 ? 3 : 0);
  if (fill > 0) doc.fillColor(color).roundedRect(x + labelW, y, fill, H, 3).fill();

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.green)
    .text(valLabel, x + labelW + barW + 5, y + 2, { width: valW, lineBreak: false });

  return y + H + 5;
}

// ---- Tableau de données paginé ----------------------------------

function drawTable(doc, data, colonnes, y0) {
  const ROW_H = 15;
  const HDR_H = 19;
  let y = y0;

  const drawHeaders = () => {
    doc.fillColor(C.green).rect(MARGIN, y, CONT_W, HDR_H).fill();
    const cw = CONT_W / colonnes.length;
    colonnes.forEach((col, i) => {
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.white)
        .text(col.header, MARGIN + i * cw + 3, y + 5, { width: cw - 6, lineBreak: false, ellipsis: true });
    });
    y += HDR_H;
  };

  drawHeaders();

  const cw = CONT_W / colonnes.length;
  data.forEach((row, idx) => {
    if (y + ROW_H > PAGE_H - 30) {
      drawFooter(doc, `Page ${doc.bufferedPageRange().count}`);
      doc.addPage();
      y = MARGIN;
      drawHeaders();
    }
    if (idx % 2 === 0) doc.fillColor(C.bgAlt).rect(MARGIN, y, CONT_W, ROW_H).fill();
    doc.fontSize(6.5).font('Helvetica').fillColor(C.text);
    colonnes.forEach((col, i) => {
      doc.text(String(row[col.key] ?? ''), MARGIN + i * cw + 3, y + 4,
        { width: cw - 6, lineBreak: false, ellipsis: true });
    });
    doc.moveTo(MARGIN, y + ROW_H).lineTo(MARGIN + CONT_W, y + ROW_H)
      .strokeColor(C.border).lineWidth(0.2).stroke();
    y += ROW_H;
  });

  return y;
}

// ================================================================
// RAPPORTS PAR ENTITE
// ================================================================

// ---- Récoltes ---------------------------------------------------

function reportHarvests(doc, data, colonnes) {
  drawHeader(doc, 'Rapport des Recoltes', `${data.length} enregistrement(s)`);
  let y = 65;

  const totalKg   = data.reduce((s, r) => s + toNum(r.quantityKg), 0);
  const avgQual   = data.length ? data.reduce((s, r) => s + toNum(r.qualityRating), 0) / data.length : 0;

  const byCultivar = {};
  data.forEach(r => {
    if (!byCultivar[r.cultivar]) byCultivar[r.cultivar] = { kg: 0, count: 0, qual: 0 };
    byCultivar[r.cultivar].kg    += toNum(r.quantityKg);
    byCultivar[r.cultivar].count += 1;
    byCultivar[r.cultivar].qual  += toNum(r.qualityRating);
  });
  const cultivars = Object.entries(byCultivar)
    .map(([name, d]) => ({ name, kg: d.kg, count: d.count, avgQ: d.count ? d.qual / d.count : 0 }))
    .sort((a, b) => b.kg - a.kg);

  // KPIs
  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,              y, kw, 'Total recolte',     `${totalKg.toFixed(1)} kg`, `${data.length} saisies`,       C.green);
  drawKPI(doc, MARGIN + kw + 5,     y, kw, 'Cultivars',         cultivars.length,            'varietes recoltees',           C.greenMed);
  drawKPI(doc, MARGIN + (kw+5)*2,   y, kw, 'Qualite moyenne',   `${avgQual.toFixed(1)}/5`,   '(note sur 5)',                 C.yellow);
  drawKPI(doc, MARGIN + (kw+5)*3,   y, kw, 'Moy. / recolte',    data.length ? `${(totalKg/data.length).toFixed(1)} kg` : '-', 'par saisie', C.blue);
  y += 72;

  // Layout bi-colonnes
  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  y = drawSectionTitle(doc, 'Recoltes par cultivar (kg)', y);
  drawBarChart(doc, MARGIN, y, lW, 150,
    cultivars.slice(0, 12).map(c => ({ label: c.name, value: parseFloat(c.kg.toFixed(1)) })),
    v => `${v} kg`
  );

  // Qualite par cultivar (droite)
  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Qualite par cultivar', rX, top + 1, { lineBreak: false });
  let qy = top + 16;
  cultivars.slice(0, 9).forEach(c => {
    const col = c.avgQ >= 4 ? C.green : c.avgQ >= 3 ? C.yellow : C.red;
    qy = drawHBar(doc, rX, qy, rW, c.avgQ / 5, `${c.avgQ.toFixed(1)}/5`, c.name, col);
  });

  y = top + 162;
  y = drawSectionTitle(doc, 'Detail des saisies', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} saisie(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Plantations ------------------------------------------------

function reportPlantings(doc, data, colonnes) {
  drawHeader(doc, 'Rapport des Plantations', `${data.length} plantation(s)`);
  let y = 65;

  const STATUS_META = [
    { key: 'PLANIFIE',      label: 'Planifie',       color: '#90A4AE' },
    { key: 'SEME',          label: 'Seme',            color: '#81C784' },
    { key: 'EN_PEPINIERE',  label: 'En pepiniere',    color: '#AED581' },
    { key: 'TRANSPLANTE',   label: 'Transplante',     color: '#4FC3F7' },
    { key: 'EN_CROISSANCE', label: 'En croissance',   color: C.greenMed },
    { key: 'EN_RECOLTE',    label: 'En recolte',      color: C.yellow },
    { key: 'TERMINE',       label: 'Termine',         color: C.green },
    { key: 'ECHEC',         label: 'Echec',           color: C.red },
  ];

  const byStatus = {};
  STATUS_META.forEach(s => { byStatus[s.key] = 0; });
  data.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });

  const byZone = {};
  data.forEach(r => { byZone[r.zone || 'Sans zone'] = (byZone[r.zone || 'Sans zone'] || 0) + 1; });

  const active = data.filter(r => !['TERMINE', 'ECHEC'].includes(r.status)).length;
  const done   = byStatus['TERME'] || byStatus['TERMINE'] || 0;
  const echec  = byStatus['ECHEC'] || 0;

  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,            y, kw, 'Total plantations', data.length,  '',                       C.green);
  drawKPI(doc, MARGIN + kw + 5,   y, kw, 'En cours',          active,       `${pct(active, data.length)}% du total`, C.greenMed);
  drawKPI(doc, MARGIN + (kw+5)*2, y, kw, 'Terminees',         done,         `${pct(done, data.length)}%`,   C.yellow);
  drawKPI(doc, MARGIN + (kw+5)*3, y, kw, 'Echecs',            echec,        `${pct(echec, data.length)}%`,  C.red);
  y += 72;

  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  y = drawSectionTitle(doc, 'Repartition par statut', y);
  const statusBars = STATUS_META
    .filter(s => byStatus[s.key] > 0)
    .map(s => ({ label: s.label, value: byStatus[s.key], color: s.color }));
  drawBarChart(doc, MARGIN, y, lW, 150, statusBars);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Repartition par zone', rX, top + 1, { lineBreak: false });
  let zy = top + 16;
  Object.entries(byZone).sort((a, b) => b[1] - a[1]).forEach(([zone, count]) => {
    zy = drawHBar(doc, rX, zy, rW, count / data.length, `${count} (${pct(count, data.length)}%)`, zone, C.green);
  });

  y = top + 162;
  y = drawSectionTitle(doc, 'Liste des plantations', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} plantation(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Tâches -----------------------------------------------------

function reportTasks(doc, data, colonnes) {
  drawHeader(doc, 'Rapport des Taches', `${data.length} tache(s)`);
  let y = 65;

  const done     = data.filter(r => r.status === 'FAIT').length;
  const todo     = data.filter(r => r.status === 'A_FAIRE').length;
  const inProg   = data.filter(r => r.status === 'EN_COURS').length;
  const urgent   = data.filter(r => r.priority === 'URGENTE').length;
  const hours    = data.reduce((s, r) => s + toNum(r.actualDurationHours), 0);

  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,            y, kw, 'Total taches',  data.length, '',                               C.green);
  drawKPI(doc, MARGIN + kw + 5,   y, kw, 'Realisees',     done,        `${pct(done, data.length)}%`,     C.greenMed);
  drawKPI(doc, MARGIN + (kw+5)*2, y, kw, 'En attente',    todo + inProg, `${inProg} en cours`,           C.yellow);
  drawKPI(doc, MARGIN + (kw+5)*3, y, kw, 'Urgentes',      urgent,      `${pct(urgent, data.length)}%`,   C.red);
  y += 72;

  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  const STATUS_META = [
    { key: 'A_FAIRE',  label: 'A faire',   color: '#90A4AE' },
    { key: 'EN_COURS', label: 'En cours',  color: C.yellow  },
    { key: 'FAIT',     label: 'Realise',   color: C.green   },
    { key: 'REPORTE',  label: 'Reporte',   color: '#FFB74D' },
    { key: 'ANNULE',   label: 'Annule',    color: C.red     },
  ];

  y = drawSectionTitle(doc, 'Statut des taches', y);
  const statusBars = STATUS_META
    .map(s => ({ label: s.label, value: data.filter(r => r.status === s.key).length, color: s.color }))
    .filter(s => s.value > 0);
  drawBarChart(doc, MARGIN, y, lW, 150, statusBars);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Repartition par priorite', rX, top + 1, { lineBreak: false });
  let py = top + 16;
  [
    { key: 'URGENTE', label: 'Urgente', color: C.red     },
    { key: 'HAUTE',   label: 'Haute',   color: '#E65100' },
    { key: 'NORMALE', label: 'Normale', color: C.yellow  },
    { key: 'BASSE',   label: 'Basse',   color: C.greenMed},
  ].forEach(p => {
    const count = data.filter(r => r.priority === p.key).length;
    if (count > 0) py = drawHBar(doc, rX, py, rW, count / data.length, `${count} (${pct(count, data.length)}%)`, p.label, p.color);
  });

  if (hours > 0) {
    py += 10;
    doc.fontSize(8).font('Helvetica').fillColor(C.textLight)
      .text('Temps total realise : ', rX, py, { lineBreak: false, continued: true });
    doc.font('Helvetica-Bold').fillColor(C.green)
      .text(`${hours.toFixed(1)} h`, { lineBreak: false });
  }

  y = top + 162;
  y = drawSectionTitle(doc, 'Liste des taches', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} tache(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Graines ----------------------------------------------------

function reportSeeds(doc, data, colonnes) {
  drawHeader(doc, 'Rapport Stock de Graines', `${data.length} reference(s)`);
  let y = 65;

  const now      = new Date();
  const in6m     = new Date(now.getTime() + 6 * 30 * 24 * 3600 * 1000);
  const expired  = data.filter(r => r.expiryDate && new Date(r.expiryDate) < now).length;
  const expiring = data.filter(r => r.expiryDate && new Date(r.expiryDate) >= now && new Date(r.expiryDate) < in6m).length;
  const totalG   = data.reduce((s, r) => s + toNum(r.quantityInStock), 0);

  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,            y, kw, 'References',          data.length,            'varietes',         C.green);
  drawKPI(doc, MARGIN + kw + 5,   y, kw, 'Stock total',         `${totalG.toFixed(0)} g`, '',               C.greenMed);
  drawKPI(doc, MARGIN + (kw+5)*2, y, kw, 'Expire < 6 mois',     expiring,               'a renouveler',     C.yellow);
  drawKPI(doc, MARGIN + (kw+5)*3, y, kw, 'Perimees',            expired,                'a eliminer',       C.red);
  y += 72;

  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  y = drawSectionTitle(doc, 'Stock par cultivar (g)', y);
  const topStock = [...data]
    .sort((a, b) => toNum(b.quantityInStock) - toNum(a.quantityInStock))
    .slice(0, 12)
    .map(r => ({ label: r.cultivar, value: toNum(r.quantityInStock), color: C.greenMed }));
  drawBarChart(doc, MARGIN, y, lW, 150, topStock, v => `${v}g`);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Etat du stock', rX, top + 1, { lineBreak: false });
  let ey = top + 16;
  const valid = data.length - expiring - expired;
  [
    { label: 'Valides',         count: valid,    color: C.green   },
    { label: 'Expire bientot',  count: expiring, color: C.yellow  },
    { label: 'Perimees',        count: expired,  color: C.red     },
  ].forEach(s => {
    if (s.count > 0) ey = drawHBar(doc, rX, ey, rW, s.count / data.length, `${s.count} (${pct(s.count, data.length)}%)`, s.label, s.color);
  });

  // Fournisseurs
  const bySupplier = {};
  data.forEach(r => { bySupplier[r.supplier || 'N/A'] = (bySupplier[r.supplier || 'N/A'] || 0) + 1; });
  const suppliers = Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (suppliers.length) {
    ey += 10;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.green)
      .text('Fournisseurs', rX, ey);
    ey += 14;
    suppliers.forEach(([name, count]) => {
      ey = drawHBar(doc, rX, ey, rW, count / data.length, `${count} ref.`, name, C.blue);
    });
  }

  y = top + 162;
  y = drawSectionTitle(doc, 'Inventaire complet', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} reference(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Pépinière --------------------------------------------------

function reportNursery(doc, data, colonnes) {
  drawHeader(doc, 'Rapport Pepiniere', `${data.length} lot(s)`);
  let y = 65;

  const ready     = data.filter(r => r.status === 'PRET_AU_REPIQUAGE').length;
  const seedsT    = data.reduce((s, r) => s + toNum(r.totalSeedsSown), 0);
  const germT     = data.reduce((s, r) => s + toNum(r.germinationCount), 0);
  const avgGerm   = seedsT > 0 ? (germT / seedsT) * 100 : 0;

  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,            y, kw, 'Lots actifs',          data.length,              '',                   C.green);
  drawKPI(doc, MARGIN + kw + 5,   y, kw, 'Prets au repiquage',   ready,                    `${pct(ready, data.length)}% des lots`, C.greenMed);
  drawKPI(doc, MARGIN + (kw+5)*2, y, kw, 'Tx de germination',    `${avgGerm.toFixed(0)}%`, `${germT}/${seedsT} graines`, C.yellow);
  drawKPI(doc, MARGIN + (kw+5)*3, y, kw, 'Graines semees',       seedsT,                   'total',              C.blue);
  y += 72;

  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  y = drawSectionTitle(doc, 'Taux de germination par cultivar (%)', y);
  const germBars = data
    .filter(r => toNum(r.germinationRate) > 0)
    .sort((a, b) => toNum(b.germinationRate) - toNum(a.germinationRate))
    .slice(0, 12)
    .map(r => {
      const val = Math.round(toNum(r.germinationRate) * 100);
      return { label: r.cultivar, value: val, color: val >= 70 ? C.green : val >= 40 ? C.yellow : C.red };
    });
  drawBarChart(doc, MARGIN, y, lW, 150, germBars, v => `${v}%`);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Avancement des lots', rX, top + 1, { lineBreak: false });
  let sy = top + 16;
  [
    { key: 'SEME',              label: 'Seme',             color: '#AED581' },
    { key: 'EN_GERMINATION',    label: 'En germination',   color: '#FFF176' },
    { key: 'EN_CROISSANCE',     label: 'En croissance',    color: C.greenMed},
    { key: 'PRET_AU_REPIQUAGE', label: 'Pret au repiquage',color: C.green   },
    { key: 'TRANSPLANTE',       label: 'Transplante',      color: '#4FC3F7' },
    { key: 'ECHEC',             label: 'Echec',            color: C.red     },
  ].forEach(s => {
    const count = data.filter(r => r.status === s.key).length;
    if (count > 0) sy = drawHBar(doc, rX, sy, rW, count / data.length, `${count} (${pct(count, data.length)}%)`, s.label, s.color);
  });

  y = top + 162;
  y = drawSectionTitle(doc, 'Detail des lots', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} lot(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Météo ------------------------------------------------------

function reportWeather(doc, data, colonnes) {
  drawHeader(doc, 'Rapport Meteo', `${data.length} jour(s) — Mormant (77720)`);
  let y = 65;

  const recent   = data.slice(0, 30);
  const avgTMax  = recent.length ? recent.reduce((s, r) => s + toNum(r.temperatureMax), 0) / recent.length : 0;
  const avgTMin  = recent.length ? recent.reduce((s, r) => s + toNum(r.temperatureMin), 0) / recent.length : 0;
  const precip   = recent.reduce((s, r) => s + toNum(r.precipitationMm), 0);
  const frost    = recent.filter(r => r.frost === true || r.frost === 'true' || r.frost === 1).length;

  const kw = (CONT_W - 15) / 4;
  drawKPI(doc, MARGIN,            y, kw, 'Temp. max moy.',    `${avgTMax.toFixed(1)}C`, '30 derniers jours', C.red);
  drawKPI(doc, MARGIN + kw + 5,   y, kw, 'Temp. min moy.',    `${avgTMin.toFixed(1)}C`, '30 derniers jours', C.blue);
  drawKPI(doc, MARGIN + (kw+5)*2, y, kw, 'Precipitations',   `${precip.toFixed(1)} mm`, '30 derniers jours', '#1565C0');
  drawKPI(doc, MARGIN + (kw+5)*3, y, kw, 'Jours de gel',      frost,                   '30 derniers jours', '#5C6BC0');
  y += 72;

  const lW  = CONT_W * 0.56;
  const rX  = MARGIN + lW + 12;
  const rW  = CONT_W - lW - 12;
  const top = y;

  y = drawSectionTitle(doc, 'Temperatures max — 20 derniers jours (C)', y);
  const tempBars = recent.slice(0, 20).reverse().map(r => {
    const t = toNum(r.temperatureMax);
    return { label: r.date.slice(5), value: t, color: t > 25 ? C.red : t > 15 ? C.yellow : C.blue };
  });
  drawBarChart(doc, MARGIN, y, lW, 150, tempBars, v => `${v}°`);

  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green)
    .text('Precipitations (mm)', rX, top + 1, { lineBreak: false });
  let ry = top + 16;
  const maxP = Math.max(...recent.map(r => toNum(r.precipitationMm)), 1);
  recent.filter(r => toNum(r.precipitationMm) > 0).slice(0, 10).forEach(r => {
    const p = toNum(r.precipitationMm);
    ry = drawHBar(doc, rX, ry, rW, p / maxP, `${p.toFixed(1)} mm`, r.date, C.blue);
  });

  y = top + 162;
  y = drawSectionTitle(doc, 'Donnees meteorologiques completes', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} jour(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ---- Fallback ---------------------------------------------------

function reportDefault(doc, data, colonnes, entity) {
  drawHeader(doc, `Export — ${entity}`, `${data.length} enregistrement(s)`);
  let y = 65;
  y = drawSectionTitle(doc, 'Donnees exportees', y);
  drawTable(doc, data, colonnes, y);
  drawFooter(doc, `${data.length} ligne(s) — Genere le ${new Date().toLocaleString('fr-FR')}`);
}

// ================================================================
// DISPATCHER PRINCIPAL
// ================================================================

function generatePDF(entity, data, colonnes, doc) {
  switch (entity) {
    case 'harvests':  return reportHarvests(doc, data, colonnes);
    case 'plantings': return reportPlantings(doc, data, colonnes);
    case 'tasks':     return reportTasks(doc, data, colonnes);
    case 'seeds':     return reportSeeds(doc, data, colonnes);
    case 'nursery':   return reportNursery(doc, data, colonnes);
    case 'weather':   return reportWeather(doc, data, colonnes);
    default:          return reportDefault(doc, data, colonnes, entity);
  }
}

module.exports = { generatePDF };
