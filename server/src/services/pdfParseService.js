// ============================================================
// Service de parsing de factures PDF de semences
// ============================================================

const pdfParse = require('pdf-parse');

/**
 * Fournisseurs connus et leurs patterns d'extraction
 */
const KNOWN_SUPPLIERS = [
  'Kokopelli', 'Graines Baumaux', 'Graines del Paìs',
  'RH Seeds', 'Ferme de Sainte Marthe', 'Semences du Puy',
  'Germinance', 'Agrosemens', 'Bingenheimer', 'ProNatura',
];

/**
 * Extrait les données d'une facture PDF de graines
 * @param {Buffer} pdfBuffer - Contenu du fichier PDF
 * @returns {Array} Liste de suggestions d'articles détectés
 */
const parseSeedInvoice = async (pdfBuffer) => {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const suggestions = [];
  let detectedSupplier = 'Inconnu';

  // Détecter le fournisseur
  for (const supplier of KNOWN_SUPPLIERS) {
    if (text.toLowerCase().includes(supplier.toLowerCase())) {
      detectedSupplier = supplier;
      break;
    }
  }

  // Parser chaque ligne pour extraire les informations sur les graines
  // Patterns courants dans les factures de semenciers français
  const patterns = [
    // Pattern: "Tomate Cœur de Bœuf - 0.5g - 3.50€"
    /^([A-ZÀ-Ü][a-zà-ü\s\-']+)\s+([A-ZÀ-Ü][a-zà-ü\s\-']+)\s*[-–]\s*(\d+[\.,]\d+)\s*g?\s*[-–]\s*(\d+[\.,]\d+)\s*€/i,
    // Pattern: "Réf. T001 Tomate Green Zebra 1g 4.20 EUR"
    /(?:réf\.?\s+\w+\s+)?([A-ZÀ-Ü][a-zà-ü\s]+)\s+([A-ZÀ-Ü][a-zà-ü\s\-']+)\s+(\d+[\.,]\d+)\s*g\s+(\d+[\.,]\d+)/i,
    // Pattern simple : ligne avec un poids en grammes et un prix
    /([A-ZÀ-Ü][a-zà-ü\s\-']{5,})\s+(\d+[\.,]\d*)\s*[gG]\s+(\d+[\.,]\d+)/,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const suggestion = {
          rawLine: line,
          supplier: detectedSupplier,
          suggestedName: cleanText(match[1] + (match[2] ? ' ' + match[2] : '')),
          weightGrams: parseFloat((match[3] || match[2] || '0').replace(',', '.')),
          unitPriceEuros: parseFloat((match[4] || match[3] || '0').replace(',', '.')),
          confidence: 'moyenne',
        };

        // Éliminer les doublons et les lignes non pertinentes
        if (suggestion.weightGrams > 0 && suggestion.unitPriceEuros > 0) {
          suggestions.push(suggestion);
        }
        break;
      }
    }
  }

  // Extraire aussi le total et la date si possible
  const totalMatch = text.match(/total\s+(?:ttc|ht)?\s*[:\s]+(\d+[\.,]\d+)\s*€?/i);
  const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);

  return {
    supplier: detectedSupplier,
    suggestions,
    rawText: text.substring(0, 2000), // Texte brut (2000 premiers chars) pour debug
    total: totalMatch ? parseFloat(totalMatch[1].replace(',', '.')) : null,
    invoiceDate: dateMatch
      ? `${dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
      : null,
    pageCount: data.numpages,
  };
};

/**
 * Nettoie un texte extrait du PDF (caractères parasites, espaces multiples)
 */
const cleanText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sÀ-ÿ\-']/g, '')
    .trim();
};

module.exports = { parseSeedInvoice };
