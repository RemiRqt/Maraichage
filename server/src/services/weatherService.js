// ============================================================
// Service Météo — Appels API Open-Meteo (Mormant, 77720)
// Coordonnées GPS : 48.6114° N, 2.8856° E
// ============================================================

const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

// Coordonnées GPS de Mormant, Seine-et-Marne
const LATITUDE = 48.6114;
const LONGITUDE = 2.8856;

/**
 * URL de l'API Open-Meteo pour les données historiques / prévisions
 */
const buildApiUrl = (startDate, endDate) => {
  const params = new URLSearchParams({
    latitude: LATITUDE,
    longitude: LONGITUDE,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'windspeed_10m_max',
      'relative_humidity_2m_mean',
      'sunshine_duration',
    ].join(','),
    timezone: 'Europe/Paris',
    start_date: startDate,
    end_date: endDate,
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
};

/**
 * Convertit les données brutes Open-Meteo en format WeatherData
 */
const parseWeatherResponse = (data) => {
  const { daily } = data;
  const days = [];

  for (let i = 0; i < daily.time.length; i++) {
    const tempMax = parseFloat(daily.temperature_2m_max[i]) || 0;
    const tempMin = parseFloat(daily.temperature_2m_min[i]) || 0;
    const tempAvg = (tempMax + tempMin) / 2;
    // sunshine_duration est en secondes dans Open-Meteo, convertir en heures
    const sunshineHours = (parseFloat(daily.sunshine_duration[i]) || 0) / 3600;

    days.push({
      date: new Date(daily.time[i]),
      temperatureMax: tempMax,
      temperatureMin: tempMin,
      temperatureAvg: Math.round(tempAvg * 10) / 10,
      precipitationMm: parseFloat(daily.precipitation_sum[i]) || 0,
      windSpeedMaxKmh: parseFloat(daily.windspeed_10m_max[i]) || 0,
      humidityAvg: parseFloat(daily.relative_humidity_2m_mean[i]) || 0,
      sunshineHours: Math.round(sunshineHours * 10) / 10,
      frost: tempMin <= 0,
      rawData: JSON.stringify({
        temperature_2m_max: daily.temperature_2m_max[i],
        temperature_2m_min: daily.temperature_2m_min[i],
        precipitation_sum: daily.precipitation_sum[i],
        windspeed_10m_max: daily.windspeed_10m_max[i],
        relative_humidity_2m_mean: daily.relative_humidity_2m_mean[i],
        sunshine_duration: daily.sunshine_duration[i],
      }),
    });
  }

  return days;
};

/**
 * Formater une date en 'YYYY-MM-DD'
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Récupère et stocke les données météo pour une plage de dates
 */
const fetchAndStoreWeather = async (startDate, endDate) => {
  const url = buildApiUrl(
    formatDate(startDate),
    formatDate(endDate)
  );

  logger.info({ url }, 'Récupération météo Open-Meteo');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur API Open-Meteo : ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const days = parseWeatherResponse(data);

  // Upsert chaque jour (insérer ou mettre à jour si déjà existant)
  let created = 0;
  let updated = 0;

  for (const day of days) {
    const existing = await prisma.weatherData.findUnique({
      where: { date: day.date },
    });

    if (existing) {
      await prisma.weatherData.update({
        where: { date: day.date },
        data: day,
      });
      updated++;
    } else {
      await prisma.weatherData.create({ data: day });
      created++;
    }
  }

  logger.info({ created, updated }, 'Données météo mises à jour');
  return { created, updated };
};

/**
 * Récupère les données météo manquantes (jusqu'à 7 jours en arrière)
 * Appelé au démarrage de l'application
 */
const fetchMissingWeatherData = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Vérifier quelles dates manquent
  const existing = await prisma.weatherData.findMany({
    where: {
      date: { gte: sevenDaysAgo, lte: today },
    },
    select: { date: true },
  });

  const existingDates = new Set(existing.map((d) => formatDate(new Date(d.date))));

  // Construire la liste des dates manquantes
  const missingDates = [];
  const current = new Date(sevenDaysAgo);
  while (current <= today) {
    if (!existingDates.has(formatDate(current))) {
      missingDates.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }

  if (missingDates.length === 0) {
    logger.info('Météo : aucune donnée manquante');
    return;
  }

  logger.info({ missingDates }, 'Récupération des données météo manquantes');

  // Récupérer toutes les dates manquantes en une seule requête
  await fetchAndStoreWeather(sevenDaysAgo, today);
};

/**
 * Récupère uniquement les données d'aujourd'hui
 */
const fetchTodayWeather = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await fetchAndStoreWeather(today, today);
};

/**
 * Récupère les prévisions des 3 prochains jours depuis Open-Meteo
 * (sans stockage en base — données en temps réel)
 */
const getForecast = async () => {
  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  const url = buildApiUrl(formatDate(today), formatDate(in3Days));
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur API Open-Meteo prévisions : ${response.status}`);
  }

  const data = await response.json();
  return parseWeatherResponse(data);
};

module.exports = {
  fetchAndStoreWeather,
  fetchMissingWeatherData,
  fetchTodayWeather,
  getForecast,
};
