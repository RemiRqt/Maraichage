import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Résumé hebdomadaire
function WeekSummary({ data }) {
  const last7 = data.slice(-7);

  const avgMax = last7.reduce((s, d) => s + (d.temp_max || 0), 0) / (last7.length || 1);
  const avgMin = last7.reduce((s, d) => s + (d.temp_min || 0), 0) / (last7.length || 1);
  const totalRain = last7.reduce((s, d) => s + (d.rain || 0), 0);
  const frostDays = last7.filter((d) => d.frost).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="card p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Temp. max moy. (7j)</p>
        <p className="text-2xl font-bold text-orange-500">{avgMax.toFixed(1)}°C</p>
      </div>
      <div className="card p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Temp. min moy. (7j)</p>
        <p className="text-2xl font-bold text-blue-500">{avgMin.toFixed(1)}°C</p>
      </div>
      <div className="card p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Précipitations (7j)</p>
        <p className="text-2xl font-bold text-blue-700">{totalRain.toFixed(1)} mm</p>
      </div>
      <div className="card p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">Jours de gel (7j)</p>
        <p className="text-2xl font-bold text-indigo-600">{frostDays}</p>
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const { activeSeason } = useSeason();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/weather/history', {
        params: {
          days: 30,
          season_id: activeSeason?.id,
        },
      });
      setHistory(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement de l\'historique météo');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Compte des jours de gel cette saison
  const frostDaysSeason = history.filter((d) => d.frost).length;

  const labels = history.map((d) =>
    format(parseISO(d.date), 'd MMM', { locale: fr })
  );

  // Données du graphique de température
  const tempChartData = {
    labels,
    datasets: [
      {
        label: 'Temp. max (°C)',
        data: history.map((d) => d.temp_max),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.1)',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Temp. min (°C)',
        data: history.map((d) => d.temp_min),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.1)',
        tension: 0.3,
        fill: false,
      },
    ],
  };

  // Données du graphique des précipitations
  const rainChartData = {
    labels,
    datasets: [
      {
        label: 'Précipitations (mm)',
        data: history.map((d) => d.rain),
        backgroundColor: '#93c5fd',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Températures sur 30 jours' },
    },
    scales: {
      y: { title: { display: true, text: '°C' } },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Précipitations quotidiennes' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'mm' } },
    },
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-6">
        <h1 className="page-title">🌤️ Météo</h1>
        {activeSeason && (
          <span className="badge bg-blue-100 text-blue-700">
            {frostDaysSeason} jour{frostDaysSeason !== 1 ? 's' : ''} de gel cette saison
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : history.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🌫️</p>
          <p>Aucune donnée météo disponible</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Résumé de la semaine */}
          <section aria-label="Résumé météo de la semaine">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Résumé — 7 derniers jours
            </h2>
            <WeekSummary data={history} />
          </section>

          {/* Graphique des températures */}
          <section aria-label="Graphique des températures">
            <div className="card p-5">
              <Line
                data={tempChartData}
                options={lineOptions}
                aria-label="Graphique des températures sur 30 jours"
              />
            </div>
          </section>

          {/* Graphique des précipitations */}
          <section aria-label="Graphique des précipitations">
            <div className="card p-5">
              <Bar
                data={rainChartData}
                options={barOptions}
                aria-label="Graphique des précipitations sur 30 jours"
              />
            </div>
          </section>

          {/* Tableau historique */}
          <section aria-label="Historique météo sur 30 jours">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Historique — 30 jours
            </h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Tableau météo historique">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Temp. max</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Temp. min</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Pluie (mm)</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Vent (km/h)</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Soleil (h)</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Gel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((day) => (
                      <tr
                        key={day.date}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${day.frost ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-800 capitalize">
                          {format(parseISO(day.date), 'EEE d MMM', { locale: fr })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-orange-600 font-medium">
                          {day.temp_max !== undefined ? `${day.temp_max}°C` : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-600 font-medium">
                          {day.temp_min !== undefined ? `${day.temp_min}°C` : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {day.rain !== undefined ? day.rain : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {day.wind_kmh !== undefined ? day.wind_kmh : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {day.sunshine_hours !== undefined ? day.sunshine_hours : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {day.frost ? (
                            <span className="text-blue-600" aria-label="Jour de gel">❄️</span>
                          ) : (
                            <span className="text-gray-300" aria-label="Pas de gel">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
