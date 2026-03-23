import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { getSpeciesIcon } from '../utils/speciesIcons';

function estimateMinutes(task) {
  const minPerM2 = parseFloat(task.taskTemplate?.minutesPerM2) || 0;
  const bedArea = parseFloat(task.bed?.areaM2) || 0;
  return minPerM2 > 0 && bedArea > 0 ? Math.round(minPerM2 * bedArea) : 0;
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function LateTasksPage() {
  const { activeSeason } = useSeason();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [durationH, setDurationH] = useState('');
  const [durationM, setDurationM] = useState('');

  const fetchData = useCallback(async () => {
    if (!activeSeason?.id) return;
    setLoading(true);
    try {
      // Charger toutes les tâches A_FAIRE de la saison
      const res = await api.get('/tasks', {
        params: { season_id: activeSeason.id, status: 'A_FAIRE' },
      });
      // Filtrer les tâches en retard (date passée, pas aujourd'hui)
      const late = (res.data || []).filter((t) => {
        if (!t.scheduledDate) return false;
        const d = parseISO(t.scheduledDate);
        return isPast(d) && !isToday(d);
      });
      // Trier du plus récent au plus ancien
      late.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
      setTasks(late);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCompleteClick = (task) => {
    const est = estimateMinutes(task);
    setDurationH(est > 0 ? String(Math.floor(est / 60)) : '');
    setDurationM(est > 0 ? String(est % 60) : '');
    setCompleteModal(task);
  };

  const handleConfirmComplete = async () => {
    const task = completeModal;
    setCompleteModal(null);
    setCompletingId(task.id);
    try {
      const body = {};
      const totalH = (parseInt(durationH) || 0) + (parseInt(durationM) || 0) / 60;
      if (totalH > 0) body.actualDurationHours = Math.round(totalH * 100) / 100;
      await api.patch(`/tasks/${task.id}/complete`, body);
      toast.success(`${task.taskTemplate?.templateName || task.name} validé`);

      const tName = (task.taskTemplate?.templateName || task.taskTemplate?.name || task.name || '').toLowerCase();
      if (tName.includes('semis') && tName.includes('pépi')) {
        const cultivarId = task.planting?.cultivar?.id || '';
        const plantingId = task.plantingId || '';
        navigate(`/pepiniere?new=1&cultivar_id=${cultivarId}&planting_id=${plantingId}`);
        return;
      } else if (tName.includes('récolte') || tName.includes('recolte')) {
        navigate('/recoltes');
        return;
      }
      fetchData();
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setCompletingId(null);
    }
  };

  const totalMin = tasks.reduce((s, t) => s + estimateMinutes(t), 0);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Tâches en retard</h1>
          <p className="text-xs text-gray-500">
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} · {formatDuration(totalMin) || '0h'} estimées
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : tasks.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3" aria-hidden="true">🎉</p>
          <p>Aucune tâche en retard</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const species = task.planting?.cultivar?.species?.name;
            const cultivar = task.planting?.cultivar?.name;
            const est = estimateMinutes(task);
            const daysLate = differenceInDays(new Date(), parseISO(task.scheduledDate));

            return (
              <div key={task.id} className="flex items-stretch rounded-xl border border-red-200 overflow-hidden shadow-sm">
                <div className="w-1.5 flex-shrink-0 bg-red-500" />
                <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 min-w-0">
                  <span className="text-lg flex-shrink-0" aria-hidden="true">
                    {species ? getSpeciesIcon(species) : '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {task.taskTemplate?.templateName || task.name}
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px]">
                      {species && <span className="text-gray-500">{species}</span>}
                      {cultivar && cultivar !== species && <span className="text-gray-400">· {cultivar}</span>}
                      {task.bed?.name && <span className="text-gray-400">· {task.bed.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {daysLate}j de retard
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Prévu {format(parseISO(task.scheduledDate), 'd MMM', { locale: fr })}
                      </span>
                      {est > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                          <ClockIcon className="h-3 w-3" />{formatDuration(est)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCompleteClick(task)}
                  disabled={completingId === task.id}
                  className="flex items-center justify-center w-14 bg-green-50 hover:bg-green-100 active:bg-green-200 transition-colors border-l border-green-200 flex-shrink-0"
                  aria-label={`Valider "${task.name}"`}
                >
                  {completingId === task.id ? (
                    <span className="text-green-600 text-sm">…</span>
                  ) : (
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmation */}
      <Modal isOpen={!!completeModal} onClose={() => setCompleteModal(null)} title="Valider la tâche">
        {completeModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Valider <strong>{completeModal.taskTemplate?.templateName || completeModal.name}</strong> ?
            </p>
            <div>
              <label className="form-label">Temps passé réel</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="1" value={durationH} onChange={(e) => setDurationH(e.target.value)}
                  className="form-input w-20 text-center" placeholder="0" />
                <span className="text-sm text-gray-500">h</span>
                <input type="number" min="0" max="59" step="5" value={durationM} onChange={(e) => setDurationM(e.target.value)}
                  className="form-input w-20 text-center" placeholder="00" />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCompleteModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleConfirmComplete} className="btn-primary flex-1">Valider</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
