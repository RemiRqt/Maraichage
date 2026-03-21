// Routes pour la gestion du stock de semences
const router = require('express').Router();
const { body, query } = require('express-validator');
const path = require('path');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  list,
  create,
  update,
  remove,
  importPdf,
  confirmImport,
} = require('../controllers/seedController');

// Configuration de multer — stockage permanent dans uploads/invoices
const fs = require('fs');
const invoicesDir = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, invoicesDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés.'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo maximum
});

// Toutes les routes nécessitent une authentification

// GET / — Liste le stock de semences avec filtres
router.get('/', [
  query('cultivar_id').optional().isString(),
  query('supplier').optional().isString(),
], list);

// POST / — Ajoute une entrée au stock
router.post('/', requireRole('ADMIN'), [
  body('cultivar_id').notEmpty().withMessage("L'identifiant du cultivar est requis"),
  body('initial_quantity').optional().isInt({ min: 0 }).withMessage('La quantité initiale doit être positive'),
], create);

// PUT /:id — Met à jour une entrée du stock
router.put('/:id', requireRole('ADMIN'), update);

// DELETE /:id — Supprime une entrée du stock
router.delete('/:id', requireRole('ADMIN'), remove);

// POST /import-pdf — Parse une facture PDF et retourne les données structurées
router.post('/import-pdf', uploadPdf.single('file'), importPdf);

// POST /confirm-import — Enregistre la facture validée et met à jour le stock
router.post('/confirm-import', confirmImport);

module.exports = router;
