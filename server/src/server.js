// ============================================================
// Point d'entrée du serveur — MalaMaraichageApp
// ============================================================

require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const { startWeatherJob } = require('./jobs/weatherJob');
const { fetchMissingWeatherData } = require('./services/weatherService');

const PORT = process.env.PORT || 3001;

// Démarrage du serveur
const server = app.listen(PORT, async () => {
  logger.info(`🌱 MalaMaraichageApp démarré sur le port ${PORT}`);
  logger.info(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);

  // Récupérer les données météo manquantes au démarrage
  try {
    await fetchMissingWeatherData();
    logger.info('🌤️  Données météo à jour');
  } catch (err) {
    logger.warn('⚠️  Impossible de récupérer les données météo au démarrage :', err.message);
  }

  // Lancer le job CRON quotidien pour la météo
  startWeatherJob();
  logger.info('⏰ Job météo CRON démarré');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt en cours...');
  server.close(() => {
    logger.info('Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt en cours...');
  server.close(() => {
    logger.info('Serveur arrêté proprement');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée :', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée :', error);
  process.exit(1);
});

module.exports = server;
