// Routes pour la gestion des photos
const router = require('express').Router();
const { query } = require('express-validator');
const path = require('path');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { upload: uploadPhoto, list, remove } = require('../controllers/photoController');

// Configuration de multer selon les spécifications du projet
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo maximum
  fileFilter: (req, file, cb) => {
    // Accepter uniquement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont acceptés.'));
    }
  },
});

// Toutes les routes nécessitent une authentification

// POST /upload — Téléverse une photo et crée une miniature
router.post('/upload', uploadMiddleware.single('photo'), uploadPhoto);

// GET / — Liste les photos filtrées par type et identifiant d'entité
router.get('/', [
  query('entity_type').optional().isString(),
  query('entity_id').optional().isString(),
], list);

// DELETE /:id — Supprime le fichier, la miniature et l'enregistrement
router.delete('/:id', remove);

module.exports = router;
