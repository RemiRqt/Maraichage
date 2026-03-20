// Contrôleur pour les données météorologiques
const https = require('https');
const prisma = require('../utils/prisma');

// URL de l'API Open-Meteo pour les prévisions locales (Melun, Seine-et-Marne)
const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=48.6114&longitude=2.8856' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean,sunshine_duration' +
  '&timezone=Europe/Paris&forecast_days=4';

// Utilitaire pour effectuer une requête HTTPS et retourner les données JSON
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Réponse invalide de l\'API météo.'));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
};

// GET / — Historique météo trié par date décroissante
const history = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }

    const weatherData = await prisma.weatherData.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(weatherData);
  } catch (err) {
    next(err);
  }
};

// GET /today — Données météo du jour
const today = async (req, res, next) => {
  try {
    const now = new Date();
    // Début et fin de la journée en cours
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const weatherToday = await prisma.weatherData.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (!weatherToday) {
      return res.status(404).json({
        message: 'Aucune donnée météo disponible pour aujourd\'hui.',
      });
    }

    res.json(weatherToday);
  } catch (err) {
    next(err);
  }
};

// GET /forecast — Prévisions météo des 3 prochains jours depuis Open-Meteo
const forecast = async (req, res, next) => {
  try {
    const data = await fetchJson(OPEN_METEO_URL);

    // Extraire uniquement les 3 prochains jours (index 1 à 3, l'index 0 étant aujourd'hui)
    const daily = data.daily;
    const previsions = [];

    for (let i = 1; i <= 3; i++) {
      previsions.push({
        date: daily.time[i],
        temperatureMax: daily.temperature_2m_max[i],
        temperatureMin: daily.temperature_2m_min[i],
        precipitationMm: daily.precipitation_sum[i],
        windSpeedMaxKmh: daily.windspeed_10m_max[i],
        humidityAvg: daily.relative_humidity_2m_mean[i],
        sunshineHours: daily.sunshine_duration[i]
          ? parseFloat((daily.sunshine_duration[i] / 3600).toFixed(1))
          : null,
      });
    }

    res.json({
      source: 'Open-Meteo',
      localisation: 'Melun, Seine-et-Marne (48.61°N, 2.89°E)',
      previsions,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { history, today, forecast };
