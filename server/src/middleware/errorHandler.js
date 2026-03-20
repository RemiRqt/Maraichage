// ============================================================
// Middleware de gestion centralisée des erreurs
// ============================================================

const logger = require('../utils/logger');

/**
 * Gestionnaire d'erreurs global Express.
 * Normalise tous les formats d'erreurs et renvoie une réponse JSON cohérente.
 */
const errorHandler = (err, req, res, next) => {
  // Log de l'erreur côté serveur
  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  }, 'Erreur serveur');

  // Erreur de validation Prisma (contrainte unique)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Cette valeur existe déjà',
      field: err.meta?.target,
    });
  }

  // Erreur Prisma — enregistrement introuvable
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Enregistrement introuvable' });
  }

  // Erreur de validation (express-validator)
  if (err.type === 'validation') {
    return res.status(422).json({ error: 'Données invalides', details: err.errors });
  }

  // Erreur HTTP personnalisée
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Erreur générique
  const statusCode = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Une erreur interne s\'est produite'
      : err.message || 'Erreur serveur interne';

  res.status(statusCode).json({ error: message });
};

/**
 * Crée une erreur HTTP avec code de statut personnalisé.
 */
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = errorHandler;
module.exports.createError = createError;
