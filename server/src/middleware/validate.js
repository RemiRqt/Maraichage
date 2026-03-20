// ============================================================
// Middleware de validation des requêtes (express-validator)
// ============================================================

const { validationResult } = require('express-validator');

/**
 * Vérifie les résultats de validation.
 * Si des erreurs existent, renvoie HTTP 422 avec le détail.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Données invalides',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
