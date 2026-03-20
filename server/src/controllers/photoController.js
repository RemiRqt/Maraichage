// Contrôleur pour la gestion des photos
const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');

// Dossier de destination des miniatures
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbs');

// S'assurer que le dossier des miniatures existe
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

// POST /upload — Téléverse une photo, crée une miniature, enregistre en base
const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie.' });
    }

    const { entity_type, entity_id, caption } = req.body;
    const originalFilename = req.file.filename;
    const originalPath = req.file.path;

    // Chemin de la miniature
    const thumbFilename = 'thumb_' + originalFilename;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);

    // Créer la miniature avec sharp (200x200, redimensionné en conservant le ratio)
    let sharp;
    try {
      sharp = require('sharp');
      await sharp(originalPath)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .toFile(thumbPath);
    } catch {
      // Si sharp n'est pas disponible, continuer sans miniature
      console.warn('Module sharp non disponible : miniature non générée.');
    }

    // Enregistrer la photo en base de données
    const photo = await prisma.photo.create({
      data: {
        filePath: `/uploads/${originalFilename}`,
        thumbnailPath: fs.existsSync(thumbPath) ? `/uploads/thumbs/${thumbFilename}` : null,
        caption: caption || null,
        takenAt: new Date(),
        entityType: entity_type,
        entityId: entity_id,
      },
    });

    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
};

// GET / — Liste les photos filtrées par type et identifiant d'entité
const list = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query;

    const where = {};
    if (entity_type) where.entityType = entity_type;
    if (entity_id) where.entityId = entity_id;

    const photos = await prisma.photo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(photos);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime le fichier, la miniature et l'enregistrement en base
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return res.status(404).json({ message: 'Photo introuvable.' });
    }

    // Supprimer le fichier original
    const filePath = photo.filePath ? path.join(UPLOADS_DIR, '..', photo.filePath) : null;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer la miniature si elle existe
    const thumbnailPath = photo.thumbnailPath ? path.join(UPLOADS_DIR, '..', photo.thumbnailPath) : null;
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    // Supprimer l'enregistrement en base
    await prisma.photo.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, list, remove };
