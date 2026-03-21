import { useState, useEffect } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// Détermine l'emoji météo selon les conditions
function getWeatherEmoji(rain, tempMax, sunshine) {
  if (tempMax <= 0) return '❄️';
  if (rain > 5) return '🌧️';
  if (sunshine > 6) return '☀️';
  if (sunshine > 2) return '⛅';
  return '💨';
}

function WeatherDay({ day, isToday = false }) {
  const emoji = getWeatherEmoji(day.rain ?? 0, day.temp_max ?? 15, day.sunshine_hours ?? 0);
  const dateLabel = isToday
    ? "Aujourd'hui"
    : format(parseISO(day.date), 'EEE d', { locale: fr });

  return (
    <div
      className={[
        'card flex flex-col items-center gap-1.5 p-3 sm:p-4 text-center min-w-[100px] sm:min-w-[120px] flex-shrink-0 snap-start',
        isToday ? 'ring-2 ring-[#1B5E20]' : '',
      ].join(' ')}
      aria-label={`Météo du ${dateLabel}`}
    >
      {/* Gel */}
      {day.frost && (
        <span
          className="inline-block text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold"
          aria-label="Risque de gel"
        >
          ⚠️ Gel
        </span>
      )}

      <p className="text-[10px] sm:text-xs font-medium text-gray-500 capitalize">{dateLabel}</p>
      <span className="text-2xl sm:text-4xl" aria-hidden="true">{emoji}</span>

      {/* Températures */}
      <div className="flex gap-1.5 text-xs sm:text-sm">
        <span className="font-bold text-orange-500" aria-label={`Température maximale ${day.temp_max}°C`}>
          {day.temp_max !== undefined ? `${day.temp_max}°` : '–'}
        </span>
        <span className="text-blue-400" aria-label={`Température minimale ${day.temp_min}°C`}>
          {day.temp_min !== undefined ? `${day.temp_min}°` : '–'}
        </span>
      </div>

      {/* Pluie */}
      {day.rain !== undefined && (
        <div className="text-[10px] sm:text-xs text-gray-500" aria-label={`Précipitations ${day.rain} mm`}>
          🌧️ {day.rain} mm
        </div>
      )}

      {/* Ensoleillement */}
      {day.sunshine_hours !== undefined && (
        <div className="text-[10px] sm:text-xs text-gray-500" aria-label={`Ensoleillement ${day.sunshine_hours}h`}>
          ☀️ {day.sunshine_hours}h
        </div>
      )}
    </div>
  );
}

export default function WeatherWidget() {
  const [today, setToday] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const [todayRes, forecastRes] = await Promise.allSettled([
          api.get('/weather/today'),
          api.get('/weather/forecast'),
        ]);

        if (!cancelled) {
          const raw = todayRes.status === 'fulfilled' ? todayRes.value.data : null;
          setToday(raw ? {
            date: raw.date,
            temp_max: raw.temperatureMax,
            temp_min: raw.temperatureMin,
            rain: raw.precipitationMm,
            sunshine_hours: raw.sunshineHours,
            frost: raw.frost,
          } : null);
          const previsions = forecastRes.status === 'fulfilled'
            ? (forecastRes.value.data?.previsions || []).slice(0, 3).map((d) => ({
                date: d.date,
                temp_max: d.temperatureMax,
                temp_min: d.temperatureMin,
                rain: d.precipitationMm,
                sunshine_hours: d.sunshineHours,
                frost: d.temperatureMin != null && d.temperatureMin <= 0,
              }))
            : [];
          setForecast(previsions);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center min-h-[140px]" aria-busy="true" aria-label="Chargement des données météo">
        <div className="loading-spinner h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  if (error || (!today && forecast.length === 0)) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-2 min-h-[140px] text-gray-400">
        <span className="text-3xl" aria-hidden="true">🌫️</span>
        <p className="text-sm font-medium">Données météo non disponibles</p>
      </div>
    );
  }

  return (
    <section aria-label="Météo">
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
        Météo
      </h2>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {today && <WeatherDay day={today} isToday />}
        {forecast.map((day) => (
          <WeatherDay key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}
