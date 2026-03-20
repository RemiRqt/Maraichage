import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format, parseISO, isToday, isPast, addDays, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, addWeeks, subWeeks,
  addMonths, subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TaskForm from '../components/forms/TaskForm';
import { getSpeciesIcon } from '../utils/speciesIcons';

const VIEW_MODES = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
];

// Icônes et couleurs par type de tâche
const TASK_TYPE_META = {
  'semis pépinière':  { icon: '🌰', color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  'semis direct':     { icon: '🌾', color: 'bg-amber-500',  light: 'bg-amber-50 border-amber-200 text-amber-900' },
  'transplantation':  { icon: '🌿', color: 'bg-green-500',  light: 'bg-green-50 border-green-200 text-green-900' },
  '1ère récolte':     { icon: '🥬', color: 'bg-emerald-500',light: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  'faux-semis':       { icon: '🔧', color: 'bg-gray-500',   light: 'bg-gray-50 border-gray-200 text-gray-900' },
  'désherbage thermique': { icon: '🔥', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200 text-orange-900' },
  'herse étrille':    { icon: '⚙️', color: 'bg-slate-500',  light: 'bg-slate-50 border-slate-200 text-slate-900' },
  'biodisque':        { icon: '💿', color: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200 text-blue-900' },
};

function getTaskMeta(task) {
  const name = (task.taskTemplate?.templateName || task.taskTemplate?.name || task.name || '').toLowerCase().trim();
  for (const [key, meta] of Object.entries(TASK_TYPE_META)) {
    if (name.includes(key)) return meta;
  }
  return { icon: '📋', color: 'bg-gray-400', light: 'bg-gray-50 border-gray-200 text-gray-800' };
}

function estimateMinutes(task) {
  const minPerM2 = parseFloat(task.taskTemplate?.minutesPerM2) || 0;
  const bedArea = parseFloat(task.bed?.areaM2) || 0;
  if (minPerM2 > 0 && bedArea > 0) return Math.round(minPerM2 * bedArea);
  return 0;
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// Carte de tâche — grosse, tactile, swipeable
function TaskCard({ task, onComplete, completingId }) {
  const meta = getTaskMeta(task);
  const isDone = task.status === 'FAIT';
  const isLate = task.status === 'A_FAIRE' && task.scheduledDate && isPast(parseISO(task.scheduledDate)) && !isToday(parseISO(task.scheduledDate));
  const est = estimateMinutes(task);
  const species = task.planting?.cultivar?.species?.name;
  const cultivar = task.planting?.cultivar?.name;

  return (
    <div className={`flex items-stretch rounded-xl border overflow-hidden transition-all ${isDone ? 'opacity-50 border-gray-200' : isLate ? 'border-red-300 shadow-sm' : 'border-gray-200 shadow-sm'}`}>
      {/* Bande de couleur gauche */}
      <div className={`w-1 sm:w-1.5 flex-shrink-0 ${isDone ? 'bg-gray-300' : isLate ? 'bg-red-500' : meta.color}`} />

      {/* Contenu */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 min-w-0">
        <span className="text-lg sm:text-xl flex-shrink-0" title={species || ''}>
          {species ? getSpeciesIcon(species) : meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm font-semibold leading-tight ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.taskTemplate?.templateName || task.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 gap-y-0.5 mt-0.5">
            {species && (
              <span className="text-[10px] sm:text-xs text-gray-500">{species}</span>
            )}
            {cultivar && cultivar !== species && (
              <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">· {cultivar}</span>
            )}
            {task.bed?.name && (
              <span className="text-[10px] sm:text-xs text-gray-400">· {task.bed.name}</span>
            )}
          </div>
          {(est > 0 || isLate) && (
            <div className="flex items-center gap-2 mt-0.5">
              {est > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                  <ClockIcon className="h-3 w-3" />{formatDuration(est)}
                </span>
              )}
              {isLate && (
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Retard</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bouton valider */}
      {!isDone && (
        <button
          onClick={() => onComplete(task)}
          disabled={completingId === task.id}
          className="flex items-center justify-center w-12 sm:w-16 bg-green-50 hover:bg-green-100 active:bg-green-200 transition-colors border-l border-green-200 flex-shrink-0"
          aria-label={`Valider "${task.name}"`}
        >
          {completingId === task.id ? (
            <span className="text-green-600 text-sm">…</span>
          ) : (
            <CheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
          )}
        </button>
      )}
      {isDone && (
        <div className="flex items-center justify-center w-10 sm:w-12 bg-gray-50 flex-shrink-0">
          <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
      )}
    </div>
  );
}

// Barre de charge
function WorkloadSummary({ tasks, label }) {
  const totalMin = tasks.reduce((s, t) => s + estimateMinutes(t), 0);
  const todoCount = tasks.filter((t) => t.status === 'A_FAIRE').length;
  const doneCount = tasks.filter((t) => t.status === 'FAIT').length;
  const lateCount = tasks.filter((t) => t.status === 'A_FAIRE' && t.scheduledDate && isPast(parseISO(t.scheduledDate)) && !isToday(parseISO(t.scheduledDate))).length;
  const hours = totalMin / 60;
  const maxH = 8;
  const pct = Math.min(100, (hours / maxH) * 100);
  const color = hours > 6 ? 'bg-red-500' : hours > 4 ? 'bg-orange-400' : hours > 0 ? 'bg-green-500' : 'bg-gray-200';

  return (
    <div className="card p-4">
      {label && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-900">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</span>
          {todoCount > 0 && <span className="text-orange-600">{todoCount} à faire</span>}
          {doneCount > 0 && <span className="text-green-600">{doneCount} faites</span>}
          {lateCount > 0 && <span className="text-red-600 font-semibold">{lateCount} en retard</span>}
        </div>
        <span className="text-sm font-bold text-gray-900">{formatDuration(totalMin) || '–'}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-right">Objectif : 8h/jour</p>
    </div>
  );
}

// Groupe de tâches par type
function TaskGroup({ type, tasks, onComplete, completingId }) {
  const meta = TASK_TYPE_META[type] || { icon: '📋', light: 'bg-gray-50 border-gray-200 text-gray-800' };
  const todoTasks = tasks.filter((t) => t.status !== 'FAIT');
  const doneTasks = tasks.filter((t) => t.status === 'FAIT');
  const [showDone, setShowDone] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{meta.icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{type}</h3>
        <span className="text-xs text-gray-400">({todoTasks.length})</span>
      </div>
      <div className="space-y-2">
        {todoTasks.map((t) => (
          <TaskCard key={t.id} task={t} onComplete={onComplete} completingId={completingId} />
        ))}
        {doneTasks.length > 0 && (
          <button
            onClick={() => setShowDone(!showDone)}
            className="text-xs text-gray-400 hover:text-gray-600 pl-2"
          >
            {showDone ? 'Masquer' : 'Afficher'} {doneTasks.length} terminée{doneTasks.length > 1 ? 's' : ''}
          </button>
        )}
        {showDone && doneTasks.map((t) => (
          <TaskCard key={t.id} task={t} onComplete={onComplete} completingId={completingId} />
        ))}
      </div>
    </div>
  );
}

// Vue JOUR
function DayView({ date, tasks, onComplete, completingId }) {
  // Grouper par type de tâche
  const grouped = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const type = (t.taskTemplate?.templateName || t.taskTemplate?.name || t.name || '').toLowerCase().trim();
      // Normaliser le type
      let key = type;
      for (const k of Object.keys(TASK_TYPE_META)) {
        if (type.includes(k)) { key = k; break; }
      }
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  // Ordre des types
  const typeOrder = ['semis pépinière', 'semis direct', 'transplantation', '1ère récolte', 'faux-semis', 'désherbage thermique', 'herse étrille', 'biodisque'];
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const ia = typeOrder.indexOf(a);
    const ib = typeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-4">
      <WorkloadSummary tasks={tasks} label={format(date, 'EEEE d MMMM', { locale: fr })} />

      {tasks.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🎉</p>
          <p>Aucune tâche pour ce jour</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedTypes.map((type) => (
            <TaskGroup key={type} type={type} tasks={grouped[type]} onComplete={onComplete} completingId={completingId} />
          ))}
        </div>
      )}
    </div>
  );
}

// Vue SEMAINE
function WeekView({ date, tasks, onComplete, completingId }) {
  const weekStart = startOfWeek(date, { locale: fr });
  const weekEnd = endOfWeek(date, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const tasksByDay = useMemo(() => {
    const map = {};
    days.forEach((d) => { map[format(d, 'yyyy-MM-dd')] = []; });
    tasks.forEach((t) => {
      const key = t.scheduledDate ? format(parseISO(t.scheduledDate), 'yyyy-MM-dd') : null;
      if (key && map[key]) map[key].push(t);
    });
    return map;
  }, [tasks, days]);

  return (
    <div className="space-y-4">
      <WorkloadSummary tasks={tasks} label={`Semaine du ${format(weekStart, 'd', { locale: fr })} au ${format(weekEnd, 'd MMMM', { locale: fr })}`} />

      {/* Mini barres par jour */}
      <div className="card p-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[key] || [];
            const dayMin = dayTasks.reduce((s, t) => s + estimateMinutes(t), 0);
            const todo = dayTasks.filter((t) => t.status === 'A_FAIRE').length;
            const isDayToday = isToday(d);
            const hours = dayMin / 60;
            const pct = Math.min(100, (hours / 8) * 100);
            const color = hours > 6 ? 'bg-red-500' : hours > 4 ? 'bg-orange-400' : hours > 0 ? 'bg-green-500' : 'bg-gray-200';

            return (
              <div key={key} className={`text-center ${isDayToday ? 'font-bold' : ''}`}>
                <p className={`text-[10px] uppercase ${isDayToday ? 'text-green-700' : 'text-gray-400'}`}>
                  {format(d, 'EEE', { locale: fr })}
                </p>
                <p className={`text-sm ${isDayToday ? 'text-green-700' : 'text-gray-800'}`}>{format(d, 'd')}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{todo > 0 ? `${todo}` : '–'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tâches par jour */}
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const dayTasks = tasksByDay[key] || [];
        if (dayTasks.length === 0) return null;
        const isDayToday = isToday(d);
        const dayMin = dayTasks.reduce((s, t) => s + estimateMinutes(t), 0);

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${isDayToday ? 'text-green-700' : 'text-gray-500'}`}>
                {format(d, 'EEEE d', { locale: fr })}
                {isDayToday && ' — Aujourd\'hui'}
              </h3>
              <span className="text-xs text-gray-400">
                {dayTasks.filter((t) => t.status === 'A_FAIRE').length} à faire · {formatDuration(dayMin) || '–'}
              </span>
            </div>
            <div className="space-y-2">
              {dayTasks.map((t) => (
                <TaskCard key={t.id} task={t} onComplete={onComplete} completingId={completingId} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Vue MOIS
function MonthView({ date, tasks, onComplete, completingId }) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { locale: fr });
  const calEnd = endOfWeek(monthEnd, { locale: fr });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      const key = t.scheduledDate ? format(parseISO(t.scheduledDate), 'yyyy-MM-dd') : null;
      if (key) { if (!map[key]) map[key] = []; map[key].push(t); }
    });
    return map;
  }, [tasks]);

  const [selectedDay, setSelectedDay] = useState(null);
  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedTasks = selectedKey ? (tasksByDay[selectedKey] || []) : [];

  return (
    <div className="space-y-4">
      <WorkloadSummary tasks={tasks} label={format(date, 'MMMM yyyy', { locale: fr })} />

      {/* Calendrier compact */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1.5 border-b border-gray-100">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[key] || [];
            const isCurrent = day.getMonth() === date.getMonth();
            const isDayToday = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const todoCount = dayTasks.filter((t) => t.status === 'A_FAIRE').length;
            const hasLate = dayTasks.some((t) => t.status === 'A_FAIRE' && isPast(parseISO(t.scheduledDate)) && !isToday(parseISO(t.scheduledDate)));
            const dayMin = dayTasks.reduce((s, t) => s + estimateMinutes(t), 0);

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`p-1 min-h-[52px] text-center transition-colors border-b border-r border-gray-50 ${isCurrent ? '' : 'opacity-40'} ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${isDayToday ? 'bg-green-700 text-white' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </span>
                {todoCount > 0 && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLate ? 'bg-red-500' : 'bg-orange-400'}`} />
                    <span className="text-[9px] text-gray-500">{todoCount}</span>
                  </div>
                )}
                {dayMin > 0 && (
                  <p className="text-[8px] text-gray-400">{formatDuration(dayMin)}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail jour sélectionné */}
      {selectedDay && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide capitalize">
              {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
            </h3>
            <span className="text-xs text-gray-400">
              {selectedTasks.filter((t) => t.status === 'A_FAIRE').length} à faire · {formatDuration(selectedTasks.reduce((s, t) => s + estimateMinutes(t), 0)) || '–'}
            </span>
          </div>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune tâche ce jour</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((t) => (
                <TaskCard key={t.id} task={t} onComplete={onComplete} completingId={completingId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { activeSeason } = useSeason();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completingId, setCompletingId] = useState(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const dateRange = useMemo(() => {
    if (viewMode === 'day') return { from: currentDate, to: currentDate };
    if (viewMode === 'week') return { from: startOfWeek(currentDate, { locale: fr }), to: endOfWeek(currentDate, { locale: fr }) };
    return { from: startOfMonth(currentDate), to: endOfMonth(currentDate) };
  }, [viewMode, currentDate]);

  const fetchData = useCallback(async () => {
    if (!activeSeason?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/tasks', {
        params: {
          season_id: activeSeason.id,
          date_from: format(dateRange.from, 'yyyy-MM-dd'),
          date_to: format(dateRange.to, 'yyyy-MM-dd'),
        },
      });
      setTasks(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id, dateRange.from, dateRange.to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigatePrev = () => {
    if (viewMode === 'day') setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };
  const navigateNext = () => {
    if (viewMode === 'day') setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const periodLabel = viewMode === 'day'
    ? format(currentDate, 'd MMMM yyyy', { locale: fr })
    : viewMode === 'week'
    ? `${format(startOfWeek(currentDate, { locale: fr }), 'd', { locale: fr })} – ${format(endOfWeek(currentDate, { locale: fr }), 'd MMM', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr });

  const handleComplete = async (task) => {
    setCompletingId(task.id);
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      toast.success(`${task.taskTemplate?.templateName || task.name} validé`);
      fetchData();
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-4 sm:mb-5">
        <h1 className="page-title text-lg sm:text-xl">✅ Tâches</h1>
        <button onClick={() => { setEditingTask(null); setModalOpen(true); }} className="btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">
          <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Nouvelle</span><span className="sm:hidden">+</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center">
          <button onClick={navigatePrev} className="btn-ghost p-1.5 sm:p-2"><ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <h2 className="text-xs sm:text-sm font-semibold text-gray-800 capitalize min-w-[120px] sm:min-w-[140px] text-center">{periodLabel}</h2>
          <button onClick={navigateNext} className="btn-ghost p-1.5 sm:p-2"><ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-[10px] sm:text-xs px-1.5 sm:px-2 py-1">Auj.</button>
        </div>
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
          {VIEW_MODES.map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs rounded-md transition-all ${viewMode === v.id ? 'bg-white text-[#1B5E20] shadow-sm font-semibold' : 'text-gray-500'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : viewMode === 'day' ? (
        <DayView date={currentDate} tasks={tasks} onComplete={handleComplete} completingId={completingId} />
      ) : viewMode === 'week' ? (
        <WeekView date={currentDate} tasks={tasks} onComplete={handleComplete} completingId={completingId} />
      ) : (
        <MonthView date={currentDate} tasks={tasks} onComplete={handleComplete} completingId={completingId} />
      )}

      {/* Modal tâche */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Modifier' : 'Nouvelle tâche'} size="lg">
        <TaskForm task={editingTask} onSuccess={() => { setModalOpen(false); fetchData(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
