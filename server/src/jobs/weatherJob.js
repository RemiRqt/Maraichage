// ============================================================
// Job CRON — Récupération quotidienne des données météo
// Exécuté chaque jour à 6h00 du matin
// ============================================================

const cron = require('node-cron');
const { fetchTodayWeather } = require('../services/weatherService');
const logger = require('../utils/logger');

/**
 * Démarre le job CRON de récupération météo.
 * Planning : tous les jours à 06:00
 */
const startWeatherJob = () => {
  // '0 6 * * *' = à 6h00 chaque jour
  cron.schedule('0 6 * * *', async () => {
    logger.info('⏰ Job météo démarré');
    try {
      await fetchTodayWeather();
      logger.info('✅ Données météo du jour récupérées');
    } catch (err) {
      logger.error({ err }, '❌ Erreur lors de la récupération des données météo');
    }
  }, {
    timezone: 'Europe/Paris',
  });

  logger.info('Cron météo planifié : 06:00 chaque jour (Europe/Paris)');
};

module.exports = { startWeatherJob };
