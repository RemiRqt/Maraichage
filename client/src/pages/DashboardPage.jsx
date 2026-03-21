import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  BeakerIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import WeatherWidget from '../components/weather/WeatherWidget';
import StatusBadge from '../components/ui/StatusBadge';

// Squelette de chargement pour les cartes
function CardSkeleton() {
  return (
    <div className="card p-5 animate-pulse" aria-hidden="true">
      <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-4 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  );
}

// Carte de statistique résumée
function StatCard({ icon: Icon, label, value, subValue, color = 'green' }) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.green}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { activeSeason } = useSeason();

  const [tasks, setTasks] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [nursery, setNursery] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!activeSeason?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard', {
        params: { season_id: activeSeason.id },
      });
      const data = res.data;
      setTasks(data.tachesAujourdhui || []);
      setHarvests(data.pretesARecolter || []);
      setNursery(data.pepinierePreteARepiquer || []);
      setStats(data.stats || null);
    } catch {
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCompleteTask = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      toast.success('Tâche marquée comme terminée');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      toast.error('Impossible de valider la tâche');
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Titre de la page */}
      <div className="page-header">
        <h1 className="page-title text-lg sm:text-xl">Tableau de bord</h1>
        {activeSeason && (
          <span className="badge bg-green-100 text-green-800">
            {activeSeason.name}
          </span>
        )}
      </div>

      {/* Météo — pleine largeur */}
      <WeatherWidget />

      {/* Statistiques résumées */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true" aria-label="Chargement des statistiques">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={SparklesIcon}
            label="Récoltes à faire"
            value={stats?.nbPretesARecolter ?? '–'}
            subValue="planches prêtes"
            color="green"
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Tâches aujourd'hui"
            value={stats?.nbTachesAujourdhui ?? '–'}
            subValue={stats?.nbTachesEnRetard ? `+ ${stats.nbTachesEnRetard} en retard` : ''}
            color="blue"
          />
          <StatCard
            icon={BeakerIcon}
            label="Lots pépinière"
            value={stats?.nbPepinierePreteARepiquer ?? '–'}
            subValue="prêts au repiquage"
            color="purple"
          />
          <StatCard
            icon={ExclamationCircleIcon}
            label="Tâches en retard"
            value={stats?.nbTachesEnRetard ?? '–'}
            color="orange"
          />
        </div>
      )}

      {/* Grille de cartes — 3 colonnes sur grand écran */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">

        {/* Tâches du jour */}
        <section className="card p-4 sm:p-5" aria-label="Tâches du jour">
          <h2 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
            <span aria-hidden="true">✅</span> Tâches du jour
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune tâche pour aujourd'hui 🎉
            </p>
          ) : (
            <ul role="list" className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    onChange={() => handleCompleteTask(task.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    aria-label={`Marquer "${task.name}" comme terminée`}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-800 block">
                      {task.name}
                    </span>
                    {(task.bed?.name || task.planting?.cultivar?.name) && (
                      <span className="text-xs text-gray-400">
                        {task.bed?.name}{task.planting?.cultivar?.name ? ` — ${task.planting.cultivar.name}` : ''}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Récoltes à faire */}
        <section className="card p-4 sm:p-5" aria-label="Récoltes à faire">
          <h2 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
            <span aria-hidden="true">🥬</span> Récoltes à faire
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : harvests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune récolte prévue aujourd'hui
            </p>
          ) : (
            <ul role="list" className="space-y-2">
              {harvests.slice(0, 5).map((planting) => (
                <li
                  key={planting.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800 block">
                      {planting.cultivar?.name}
                    </span>
                    <span className="text-xs text-gray-400">{planting.bed?.name}</span>
                  </div>
                  <StatusBadge status={planting.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pépinière prête */}
        <section className="card p-4 sm:p-5" aria-label="Pépinière prête au repiquage">
          <h2 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
            <span aria-hidden="true">🌿</span> Pépinière prête
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : nursery.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucun lot prêt au repiquage
            </p>
          ) : (
            <ul role="list" className="space-y-2">
              {nursery.slice(0, 5).map((batch) => (
                <li
                  key={batch.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800 block">
                      {batch.cultivar?.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {batch.containerCount} {batch.containerType}
                    </span>
                  </div>
                  <span className="badge bg-purple-100 text-purple-700 text-xs">
                    Prêt
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}
