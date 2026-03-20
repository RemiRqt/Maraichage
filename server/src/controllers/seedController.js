// Contrôleur pour la gestion du stock de semences
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');

// GET / — Liste le stock de semences avec cultivar et espèce
const list = async (req, res, next) => {
  try {
    const { cultivar_id, supplier } = req.query;

    const where = {};
    if (cultivar_id) where.cultivarId = cultivar_id;
    if (supplier) where.supplier = { contains: supplier, mode: 'insensitive' };

    const seeds = await prisma.seedInventory.findMany({
      where,
      include: {
        cultivar: {
          include: { species: true },
        },
      },
      orderBy: [
        { cultivar: { name: 'asc' } },
        { expiryDate: 'asc' },
      ],
    });

    res.json(seeds.map((s) => ({
      id: s.id,
      cultivar_id: s.cultivarId,
      cultivar_name: s.cultivar?.name || null,
      species_name: s.cultivar?.species?.name || null,
      supplier: s.supplier,
      supplierId: s.supplierId,
      quantity: s.quantityInStock,
      initial_quantity: s.initialQuantity,
      unit_price: s.unitPriceEuros,
      purchase_url: s.purchaseUrl,
      lot_number: s.lotNumber,
      purchase_date: s.purchaseDate,
      expiry_date: s.expiryDate,
      notes: s.notes,
      createdAt: s.createdAt,
    })));
  } catch (err) {
    next(err);
  }
};

// POST / — Ajoute une nouvelle entrée au stock de semences
const create = async (req, res, next) => {
  try {
    const b = req.body;
    // Accepte snake_case (frontend) et camelCase
    const cultivarId = b.cultivar_id || b.cultivarId;
    const initialQuantity = b.initial_quantity ?? b.initialQuantity ?? 0;
    const quantityInStock = b.quantity ?? b.quantityInStock ?? initialQuantity;
    const expiryDate = b.expiry_date || b.expiryDate;
    const purchaseUrl = b.purchase_url || b.purchaseUrl;
    const lotNumber = b.lot_number || b.lotNumber;
    const purchaseDate = b.purchase_date || b.purchaseDate;

    if (!cultivarId) return res.status(400).json({ error: 'cultivar_id requis' });

    const seed = await prisma.seedInventory.create({
      data: {
        cultivarId,
        initialQuantity: parseInt(initialQuantity) || 0,
        quantityInStock: parseInt(quantityInStock) || 0,
        unitPriceEuros: parseFloat(b.unit_price || b.unitPriceEuros) || 0,
        purchaseUrl: purchaseUrl || null,
        supplier: b.supplier || null,
        lotNumber: lotNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: b.notes || null,
      },
      include: { cultivar: { include: { species: true } } },
    });

    res.status(201).json(seed);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une entrée du stock
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const b = req.body;

    const data = {};
    const iq = b.initial_quantity ?? b.initialQuantity;
    const qs = b.quantity ?? b.quantityInStock;
    const ed = b.expiry_date ?? b.expiryDate;
    const pd = b.purchase_date ?? b.purchaseDate;

    if (iq !== undefined) data.initialQuantity = parseInt(iq);
    if (qs !== undefined) data.quantityInStock = parseInt(qs);
    if (b.unit_price !== undefined || b.unitPriceEuros !== undefined)
      data.unitPriceEuros = parseFloat(b.unit_price ?? b.unitPriceEuros);
    if (b.purchase_url !== undefined || b.purchaseUrl !== undefined)
      data.purchaseUrl = b.purchase_url ?? b.purchaseUrl;
    if (b.supplier !== undefined) data.supplier = b.supplier;
    if (b.lot_number !== undefined || b.lotNumber !== undefined)
      data.lotNumber = b.lot_number ?? b.lotNumber;
    if (pd !== undefined) data.purchaseDate = pd ? new Date(pd) : null;
    if (ed !== undefined) data.expiryDate = ed ? new Date(ed) : null;
    if (b.notes !== undefined) data.notes = b.notes;

    const seed = await prisma.seedInventory.update({
      where: { id },
      data,
      include: { cultivar: { include: { species: true } } },
    });

    res.json(seed);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une entrée du stock
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.seedInventory.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Parseur de factures PDF ───────────────────────────────────────────────

const FR_MONTHS = {
  janvier:'01', février:'02', mars:'03', avril:'04', mai:'05', juin:'06',
  juillet:'07', août:'08', septembre:'09', octobre:'10', novembre:'11', décembre:'12',
};

function parseFrDate(d) {
  if (!d) return null;
  // DD/MM/YYYY ou DD-MM-YYYY
  if (/^\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}$/.test(d)) {
    const [day, month, year] = d.split(/[\/\-\.]/);
    return `${year}-${month}-${day}`;
  }
  // MM/YYYY
  if (/^\d{2}[\/\-\.]\d{4}$/.test(d)) {
    const [m, y] = d.split(/[\/\-\.]/);
    return `${y}-${m}-01`;
  }
  // YYYY-MM-DD
  if (/^\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}$/.test(d)) return d.replace(/[\/\.]/g, '-');
  return null;
}

function parseFrTextDate(text) {
  // "14 Mars 2026" ou "14 mars 2026"
  const m = text.match(/\b(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+(\d{4})\b/i);
  if (!m) return null;
  const month = FR_MONTHS[m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
    || FR_MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

// Parser spécialisé Agrosemens
// Format : REF COND_TYPE COND_QTY NOM - Conditionnement : DESC PRIX_U(4dec) QTE(lazy) TOTAL(4dec) TVA%
function parseAgrosemensLine(line) {
  const m = line.match(
    /^([A-Z]{2,5}\d{2,3})\s+([A-Z]{1,4})\s+(\d{3,4})([A-Z][^-]+?)\s*-\s*Conditionnement\s*:\s*([^\n]+?)(\d+,\d{4})(\d+?)(\d+,\d{4})(\d+,\d{2})%/
  );
  if (!m) return null;

  const [, ref, condType, condQtyCode, nom, condDesc, rawUnitPrice, rawQtyOrdered, rawTotalPrice, rawTva] = m;

  const condQtyNum = parseInt(condQtyCode, 10);
  const isMille = condType.startsWith('M');
  const condQty = isMille ? condQtyNum * 1000 : condQtyNum;
  const condUnit = (condType === 'G' && !condType.includes('N') && !condType.includes('C')) ? 'grammes' : 'graines';
  const qtyOrdered = parseInt(rawQtyOrdered, 10);
  const quantityG = condUnit === 'grammes' ? condQty * qtyOrdered : null;

  return {
    rawText: line,
    reference: ref.trim(),
    description: nom.trim(),
    packaging: `${condDesc.trim()} (${condQty} ${condUnit})`,
    unitType: condUnit,
    unitQty: condQty,
    quantityG,
    qtyOrdered,
    unitPrice: parseFloat(rawUnitPrice.replace(',', '.')),
    totalPrice: parseFloat(rawTotalPrice.replace(',', '.')),
    tvaRate: parseFloat(rawTva.replace(',', '.')),
    lotNumber: null,
    expiryDate: null,
    cultivarId: null,
  };
}

// Parser générique pour d'autres formats
function parseGenericLine(line) {
  const lotRe = /(?:Lot\s*[nN]°?|[Nn]°?\s*[Ll]ot|LOT)[:\s]*([A-Z0-9\-]+)/i;
  const expiryRe = /(?:DLU|[Ee]xpir(?:ation|y)?|[Dd]ate\s*limite)[:\s]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}|\d{2}[\/\-\.]\d{4})/i;
  // Quantité en grammes ou kg
  const weightRe = /(\d+[\.,]?\d*)\s*(g|kg|gr)\b/i;
  // Quantité en graines / plants / bulbes
  const seedCountRe = /(\d+)\s*(graines?|plants?|bulbes?|semences?|sachets?|pièces?|unités?)/i;
  // Référence produit (code alphanumérique en début de ligne)
  const refRe = /^([A-Z]{2,6}\d{2,6})\s+/;
  // Nombre de paquets : "2 x", "x 2", "Qté : 2"
  const qtyOrderedRe = /(?:Qté?\s*[:\-]\s*|x\s*)(\d+)|(\d+)\s*x\b/i;

  const weightMatch = line.match(weightRe);
  const seedMatch = line.match(seedCountRe);
  const refMatch = line.match(refRe);
  const qtyOrderedMatch = line.match(qtyOrderedRe);

  // Chercher montants au format X,XX ou X.XX avec optionnel €
  const priceMatches = [...line.matchAll(/(\d{1,6}[,\.]\d{2})\s*(?:€|EUR|%)?/g)]
    .filter(m => !m[0].endsWith('%'));

  if (!weightMatch && !seedMatch && priceMatches.length === 0) return null;
  if (/^(?:Total|Sous-total|TVA|HT|TTC|Remise|Port|Frais|Montant|Poids brut)/i.test(line)) return null;
  if (line.length < 8) return null;

  let unitType = null, unitQty = null, quantityG = null;
  let qtyOrdered = qtyOrderedMatch
    ? parseInt(qtyOrderedMatch[1] || qtyOrderedMatch[2], 10)
    : 1;

  if (weightMatch) {
    const val = parseFloat(weightMatch[1].replace(',', '.'));
    unitQty = weightMatch[2].toLowerCase() === 'kg' ? val * 1000 : val;
    unitType = 'grammes';
    quantityG = unitQty * qtyOrdered;
  } else if (seedMatch) {
    unitQty = parseInt(seedMatch[1], 10);
    unitType = seedMatch[2].toLowerCase().replace(/s$/, ''); // normalize to singular
  }

  let unitPrice = null, totalPrice = null;
  if (priceMatches.length >= 2) {
    unitPrice = parseFloat(priceMatches[0][1].replace(',', '.'));
    totalPrice = parseFloat(priceMatches[priceMatches.length - 1][1].replace(',', '.'));
  } else if (priceMatches.length === 1) {
    totalPrice = parseFloat(priceMatches[0][1].replace(',', '.'));
  }

  const lotMatch = line.match(lotRe);
  const expiryMatch = line.match(expiryRe);

  const description = line
    .replace(refRe, '').replace(weightRe, '').replace(seedCountRe, '')
    .replace(/\d{1,6}[,\.]\d{2}\s*(?:€|EUR)?/g, '')
    .replace(lotRe, '').replace(expiryRe, '').replace(/\s{2,}/g, ' ').trim();

  if (description.length < 3 && !unitQty) return null;

  return {
    rawText: line,
    reference: refMatch ? refMatch[1] : null,
    description: description || line,
    packaging: unitQty && unitType ? `${unitQty} ${unitType}` : null,
    unitType,
    unitQty,
    quantityG,
    qtyOrdered,
    unitPrice,
    totalPrice,
    tvaRate: null,
    lotNumber: lotMatch ? lotMatch[1] : null,
    expiryDate: expiryMatch ? parseFrDate(expiryMatch[1]) : null,
    cultivarId: null,
  };
}

function parseInvoice(rawText, fileName) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 1);
  const full = rawText;

  // --- Fournisseur ---
  const siretMatch = full.match(/(?:SIRET\s*[:\s]*)(\d[\d\s]{12,16}\d)/i);
  const siret = siretMatch ? siretMatch[1].replace(/\s/g, '') : null;

  const emailMatch = full.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : null;

  const phoneMatch = full.match(/(\+?33[\s.\-]?[1-9][\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}|0[1-9](?:[\s.\-]?\d{2}){4})/);
  const phone = phoneMatch ? phoneMatch[1].replace(/[\s.\-]/g, '') : null;

  const websiteMatch = full.match(/(?:www\.[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?|https?:\/\/[^\s]+)/i);
  const website = websiteMatch ? websiteMatch[0] : null;

  // --- Nom fournisseur ---
  // Stratégie 1 : "SAS/SARL/SASU NOMCOMPAGNIE" (en dehors de "SAS au capital")
  let supplierName = '';
  const legalMatch = full.match(/(?:SAS|SARL|SASU|EURL|SNC)\s+([A-Z][A-Z\s\-]{2,40})(?=\s*\n|\s*$|\s+au\s+capital|\s+[\-–])/m);
  if (legalMatch) {
    supplierName = legalMatch[1].trim();
  }
  // Stratégie 2 : domaine email → capitalize
  if (!supplierName && email) {
    const domainMatch = email.match(/@([a-z][a-z0-9]+)\./i);
    if (domainMatch) supplierName = domainMatch[1][0].toUpperCase() + domainMatch[1].slice(1);
  }
  // Stratégie 3 : nom du fichier sans extension
  if (!supplierName && fileName) {
    supplierName = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  }

  // --- Adresse fournisseur ---
  // Chercher "CODE_POSTAL VILLE" sur une ligne avec contexte de rue avant
  const addressMatch = full.match(/(\d{1,4}[^\n]{5,60})\n([^\n]{3,60})\n(\d{5}\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][A-Za-zÀ-ÿ\s\-]{2,30})/);
  const address = addressMatch
    ? `${addressMatch[1].trim()}, ${addressMatch[2].trim()}, ${addressMatch[3].trim()}`
    : null;

  // --- Facture ---
  // N° facture : "FACTURE eFA...", "Facture N° ...", "Commande N°...", "N° Facture..."
  const numMatch = full.match(/FACTURE\s+([a-zA-Z0-9\-\/]{3,30})/i)
    || full.match(/(?:Facture\s*[Nn]°?|N°\s*(?:de\s*)?[Ff]acture|Invoice\s*[Nn]o?\.?)\s*[:\s]?([A-Z0-9\-\/]{3,30})/i)
    || full.match(/(?:Commande\s*[Nn]°?\s*[:\s]?)([0-9]{5,15})/i);
  const invoiceNumber = numMatch ? numMatch[1].trim() : `IMPORT-${Date.now()}`;

  // Date : texte français "14 Mars 2026" puis DD/MM/YYYY
  const invoiceDate = parseFrTextDate(full)
    || (() => {
      const m = full.match(/(?:du|Date\s*[:\s]*)\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i)
        || full.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
      return m ? parseFrDate(m[1]) : null;
    })();

  // Total TTC : "Montant : X €" ou "TOTAL TTC"
  const totalMatch = full.match(/Montant\s*:\s*(\d+[,\.]\d{2})\s*€/i)
    || full.match(/(?:Total\s*TTC|TOTAL\s*TTC)[^\d]*(\d[\d\s]*[,\.]\d{2})/i);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

  // --- Lignes ---
  // Détecter format Agrosemens (lignes avec "Conditionnement :")
  const isAgrosemens = full.includes('Conditionnement :');

  const invoiceLines = [];
  for (const line of lines) {
    let parsed = null;
    if (isAgrosemens) {
      parsed = parseAgrosemensLine(line);
    }
    if (!parsed) {
      parsed = parseGenericLine(line);
    }
    if (parsed) invoiceLines.push(parsed);
  }

  return {
    supplier: { name: supplierName, siret, email, phone, website, address },
    invoice: { number: invoiceNumber, date: invoiceDate, totalAmount, fileName },
    lines: invoiceLines,
    totalPages: null,
    texteExtrait: rawText.substring(0, 3000),
  };
}

// ─── Correspondance automatique cultivar ──────────────────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retirer accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCultivar(description, cultivars) {
  if (!description) return { cultivarId: null, confidence: 'none', candidates: [] };

  const desc = normalize(description);
  const scores = [];

  for (const c of cultivars) {
    const cultivarName = normalize(c.name);
    const speciesName = normalize(c.species?.name || '');
    let score = 0;

    // Correspondance exacte cultivar dans la description
    if (desc.includes(cultivarName)) score += 100;
    // Correspondance partielle : chaque mot du cultivar dans la description
    else {
      const words = cultivarName.split(' ').filter(w => w.length > 2);
      const matched = words.filter(w => desc.includes(w));
      if (words.length > 0) score += Math.round((matched.length / words.length) * 70);
    }

    // Bonus si l'espèce est aussi mentionnée
    if (speciesName && desc.includes(speciesName)) score += 30;
    else {
      // Correspondance partielle espèce
      const spWords = speciesName.split(' ').filter(w => w.length > 3);
      if (spWords.length > 0 && spWords.some(w => desc.includes(w))) score += 15;
    }

    if (score > 0) scores.push({ cultivarId: c.id, name: c.name, species: c.species?.name, score });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 3);

  if (top.length === 0) return { cultivarId: null, confidence: 'none', candidates: [] };
  if (top[0].score >= 100) return { cultivarId: top[0].cultivarId, confidence: 'high', candidates: top };
  if (top[0].score >= 60)  return { cultivarId: top[0].cultivarId, confidence: 'medium', candidates: top };
  return { cultivarId: null, confidence: 'low', candidates: top };
}

// POST /import-pdf — Parse une facture PDF et retourne les données structurées
const importPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier PDF fourni.' });
    }

    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      return res.status(500).json({ message: 'Le module pdf-parse est requis.' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);

    const storedFileName = path.basename(req.file.path);
    const result = parseInvoice(pdfData.text, req.file.originalname);
    result.totalPages = pdfData.numpages;
    result.invoice.storedFileName = storedFileName;
    result.invoice.fileUrl = `/uploads/invoices/${storedFileName}`;

    // Charger tous les cultivars pour la correspondance automatique
    const cultivars = await prisma.cultivar.findMany({
      include: { species: true },
    });

    // Ajouter correspondance pour chaque ligne
    result.lines = result.lines.map((line) => {
      const match = matchCultivar(
        `${line.description || ''} ${line.packaging || ''}`.trim(),
        cultivars
      );
      return {
        ...line,
        cultivarId: match.cultivarId,
        matchConfidence: match.confidence,
        matchCandidates: match.candidates,
      };
    });

    // Statistiques de correspondance
    const stats = result.lines.reduce((acc, l) => {
      acc[l.matchConfidence] = (acc[l.matchConfidence] || 0) + 1;
      return acc;
    }, {});
    result.matchStats = stats;

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /confirm-import — Enregistre la facture et met à jour le stock
const confirmImport = async (req, res, next) => {
  try {
    const { supplier, invoice, lines } = req.body;

    // Vérifier doublon par numéro de facture
    const existing = await prisma.invoice.findUnique({ where: { number: invoice.number } });
    if (existing) {
      return res.status(409).json({
        message: `La facture N°${invoice.number} a déjà été importée.`,
        invoiceId: existing.id,
      });
    }

    // Créer ou retrouver le fournisseur
    let supplierId = supplier.id || null;
    if (!supplierId) {
      const newSupplier = await prisma.supplier.create({
        data: {
          name: supplier.name || 'Inconnu',
          siret: supplier.siret || null,
          email: supplier.email || null,
          phone: supplier.phone || null,
          website: supplier.website || null,
          address: supplier.address || null,
        },
      });
      supplierId = newSupplier.id;
    } else {
      // Mettre à jour les infos si l'id est fourni
      await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          siret: supplier.siret || undefined,
          email: supplier.email || undefined,
          phone: supplier.phone || undefined,
          website: supplier.website || undefined,
          address: supplier.address || undefined,
        },
      });
    }

    // Créer la facture avec ses lignes
    const newInvoice = await prisma.invoice.create({
      data: {
        supplierId,
        number: invoice.number,
        date: invoice.date ? new Date(invoice.date) : null,
        totalAmount: invoice.totalAmount ? parseFloat(invoice.totalAmount) : null,
        fileName: invoice.storedFileName || invoice.fileName || null,
        lines: {
          create: lines.map((l) => ({
            rawText: l.rawText || l.description || '',
            reference: l.reference || null,
            description: l.description || null,
            packaging: l.packaging || null,
            unitType: l.unitType || null,
            unitQty: l.unitQty != null ? parseFloat(l.unitQty) : null,
            cultivarId: l.cultivarId || null,
            quantityG: l.quantityG != null ? parseFloat(l.quantityG) : null,
            qtyOrdered: l.qtyOrdered != null ? parseInt(l.qtyOrdered) : null,
            unitPrice: l.unitPrice != null ? parseFloat(l.unitPrice) : null,
            totalPrice: l.totalPrice != null ? parseFloat(l.totalPrice) : null,
            tvaRate: l.tvaRate != null ? parseFloat(l.tvaRate) : null,
            lotNumber: l.lotNumber || null,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
          })),
        },
      },
      include: { lines: true },
    });

    // Créer les entrées de stock pour les lignes avec cultivar associé
    let seedsCreated = 0;
    const supplierRecord = await prisma.supplier.findUnique({ where: { id: supplierId } });

    for (const line of lines) {
      if (!line.cultivarId) continue;
      // Quantité totale = unitQty × qtyOrdered (graines OU grammes)
      const unitQty = line.unitQty != null ? parseFloat(line.unitQty) : null;
      const qtyOrdered = line.qtyOrdered != null ? parseInt(line.qtyOrdered) : 1;
      const totalQty = unitQty != null
        ? unitQty * qtyOrdered
        : line.quantityG != null
          ? parseFloat(line.quantityG)
          : 0;

      await prisma.seedInventory.create({
        data: {
          cultivarId: line.cultivarId,
          supplierId,
          supplier: supplierRecord.name,
          initialQuantity: Math.round(totalQty),
          quantityInStock: Math.round(totalQty),
          unitPriceEuros: line.unitPrice != null ? parseFloat(line.unitPrice) : 0,
          lotNumber: line.lotNumber || null,
          purchaseDate: invoice.date ? new Date(invoice.date) : null,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          notes: line.unitType ? `Unité : ${line.unitType} (${unitQty} × ${qtyOrdered})` : null,
        },
      });
      seedsCreated++;
    }

    res.status(201).json({
      message: `Facture importée. ${seedsCreated} entrée(s) de stock créée(s).`,
      invoiceId: newInvoice.id,
      seedsCreated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove, importPdf, confirmImport };
