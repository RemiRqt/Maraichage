import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

function getWeatherEmoji(rain, tempMax, sunshine) {
  if (tempMax <= 0) return '❄️';
  if (rain > 5) return '🌧️';
  if (sunshine > 6) return '☀️';
  if (sunshine > 2) return '⛅';
  return '💨';
}

// Carte jour actuel — full width, horizontale
function TodayCard({ day }) {
  const emoji = getWeatherEmoji(day.rain ?? 0, day.temp_max ?? 15, day.sunshine_hours ?? 0);

  return (
    <div className="card p-4 flex items-center gap-4 ring-2 ring-green-500 bg-green-50/40">
      <span className="text-5xl flex-shrink-0" aria-hidden="true">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Aujourd'hui</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-2xl font-bold text-orange-500">{day.temp_max ?? '–'}°</span>
          <span className="text-lg text-blue-400">{day.temp_min ?? '–'}°</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
          {day.rain !== undefined && <span>🌧️ {day.rain} mm</span>}
          {day.sunshine_hours !== undefined && <span>☀️ {day.sunshine_hours}h</span>}
        </div>
      </div>
      {day.frost && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold flex-shrink-0">⚠️ Gel</span>
      )}
    </div>
  );
}

// Petite carte prévision
function ForecastCard({ day }) {
  const emoji = getWeatherEmoji(day.rain ?? 0, day.temp_max ?? 15, day.sunshine_hours ?? 0);
  const dateLabel = format(parseISO(day.date), 'EEE d', { locale: fr });

  return (
    <div className="card p-2.5 flex flex-col items-center gap-1 text-center flex-1">
      <p className="text-[10px] font-medium text-gray-500 capitalize">{dateLabel}</p>
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <div className="flex gap-1 text-xs">
        <span className="font-bold text-orange-500">{day.temp_max ?? '–'}°</span>
        <span className="text-blue-400">{day.temp_min ?? '–'}°</span>
      </div>
      {day.rain !== undefined && day.rain > 0 && (
        <p className="text-[9px] text-gray-400">🌧️ {day.rain}mm</p>
      )}
      {day.frost && (
        <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full font-semibold">Gel</span>
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
      <div className="card p-6 flex items-center justify-center min-h-[100px]" aria-busy="true">
        <div className="loading-spinner h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  if (error || (!today && forecast.length === 0)) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-2 min-h-[100px] text-gray-400">
        <span className="text-3xl" aria-hidden="true">🌫️</span>
        <p className="text-sm font-medium">Données météo non disponibles</p>
      </div>
    );
  }

  return (
    <section aria-label="Météo" className="space-y-2">
      {today && <TodayCard day={today} />}
      {forecast.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {forecast.map((day) => (
            <ForecastCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </section>
  );
}
