import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

// Types d'événements avec leurs couleurs
const EVENT_COLORS = {
  SEMIS: 'bg-blue-400',
  TRANSPLANTATION: 'bg-indigo-400',
  RECOLTE: 'bg-green-400',
  TACHE: 'bg-orange-400',
};

const EVENT_LABELS = {
  SEMIS: 'Semis',
  TRANSPLANTATION: 'Transplantation',
  RECOLTE: 'Récolte',
  TACHE: 'Tâche',
};

function EventDot({ type }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${EVENT_COLORS[type] || 'bg-gray-400'}`}
      aria-label={EVENT_LABELS[type] || type}
    />
  );
}

function EventPill({ event }) {
  const colorClass = EVENT_COLORS[event.type] || 'bg-gray-400';
  return (
    <div
      className={`text-white text-xs px-1.5 py-0.5 rounded truncate ${colorClass}`}
      title={event.label}
    >
      {event.label}
    </div>
  );
}

// Panneau latéral pour les événements d'une journée — interactif
function DayPanel({ date, events, onClose, onRefresh }) {
  const [completingId, setCompletingId] = useState(null);
  const [harvestModal, setHarvestModal] = useState(null);
  const [harvestForm, setHarvestForm] = useState({ quantityKg: '', qualityRating: '', notes: '' });
  const [harvestSaving, setHarvestSaving] = useState(false);

  if (!date) return null;

  const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), date));

  // Grouper par type
  const groupedByType = {};
  dayEvents.forEach((e) => {
    if (!groupedByType[e.type]) groupedByType[e.type] = [];
    groupedByType[e.type].push(e);
  });

  const typeOrder = ['TACHE', 'RECOLTE', 'SEMIS', 'TRANSPLANTATION'];

  // Valider une tâche
  const handleCompleteTask = async (taskId) => {
    setCompletingId(taskId);
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      toast.success('Tâche terminée');
      onRefresh();
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setCompletingId(null);
    }
  };

  // Créer une récolte
  const handleCreateHarvest = async (e) => {
    e.preventDefault();
    if (!harvestModal?.plantingId) return;
    setHarvestSaving(true);
    try {
      await api.post('/harvests', {
        plantingId: harvestModal.plantingId,
        date: format(date, 'yyyy-MM-dd'),
        quantityKg: parseFloat(harvestForm.quantityKg) || 0,
        qualityRating: harvestForm.qualityRating ? parseInt(harvestForm.qualityRating) : null,
        notes: harvestForm.notes || null,
      });
      toast.success('Récolte enregistrée');
      setHarvestModal(null);
      setHarvestForm({ quantityKg: '', qualityRating: '', notes: '' });
      onRefresh();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setHarvestSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl flex flex-col" role="dialog" aria-label={`Événements du ${format(date, 'd MMMM yyyy', { locale: fr })}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 capitalize">
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fermer">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {dayEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun événement ce jour</p>
          ) : (
            typeOrder.filter((t) => groupedByType[t]).map((type) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${EVENT_COLORS[type]}`} />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {EVENT_LABELS[type]}s ({groupedByType[type].length})
                  </h3>
                </div>

                <ul className="space-y-2">
                  {groupedByType[type].map((event, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.label}</p>
                        {event.detail && <p className="text-xs text-gray-500">{event.detail}</p>}
                        {event.status && event.status !== 'FAIT' && (
                          <span className="text-[10px] text-gray-400">{event.status}</span>
                        )}
                        {event.status === 'FAIT' && (
                          <span className="text-[10px] text-green-600 font-medium">Terminée</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Tâche : valider */}
                        {type === 'TACHE' && event.taskId && event.status !== 'FAIT' && (
                          <button
                            onClick={() => handleCompleteTask(event.taskId)}
                            disabled={completingId === event.taskId}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            title="Marquer comme terminée"
                          >
                            {completingId === event.taskId ? '…' : (
                              <><CheckIcon className="h-3.5 w-3.5" /> Fait</>
                            )}
                          </button>
                        )}

                        {/* Récolte : créer */}
                        {type === 'RECOLTE' && event.plantingId && (
                          <button
                            onClick={() => {
                              setHarvestModal(event);
                              setHarvestForm({ quantityKg: '', qualityRating: '', notes: '' });
                            }}
                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            title="Enregistrer une récolte"
                          >
                            <PlusIcon className="h-3.5 w-3.5" /> Récolter
                          </button>
                        )}

                        {/* Semis/Transplantation : lien vers plantation */}
                        {(type === 'SEMIS' || type === 'TRANSPLANTATION') && event.plantingId && (
                          <a
                            href={`/plantations/${event.plantingId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-400 hover:text-green-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Voir
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal récolte */}
      <Modal isOpen={!!harvestModal} onClose={() => setHarvestModal(null)} title="Enregistrer une récolte" size="sm">
        <form onSubmit={handleCreateHarvest} className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>{harvestModal?.label}</strong></p>
            {harvestModal?.detail && <p className="text-gray-400">{harvestModal.detail}</p>}
            <p className="text-gray-400 mt-1">{format(date, 'd MMMM yyyy', { locale: fr })}</p>
          </div>
          <div>
            <label htmlFor="harvest-qty" className="form-label">Quantité récoltée (kg) *</label>
            <input
              id="harvest-qty"
              type="number"
              step="0.1"
              min="0"
              required
              value={harvestForm.quantityKg}
              onChange={(e) => setHarvestForm((f) => ({ ...f, quantityKg: e.target.value }))}
              className="form-input"
              placeholder="ex: 2.5"
            />
          </div>
          <div>
            <label htmlFor="harvest-quality" className="form-label">Qualité (1-5)</label>
            <select
              id="harvest-quality"
              value={harvestForm.qualityRating}
              onChange={(e) => setHarvestForm((f) => ({ ...f, qualityRating: e.target.value }))}
              className="form-input"
            >
              <option value="">Non évalué</option>
              <option value="1">1 — Médiocre</option>
              <option value="2">2 — Passable</option>
              <option value="3">3 — Correct</option>
              <option value="4">4 — Bon</option>
              <option value="5">5 — Excellent</option>
            </select>
          </div>
          <div>
            <label htmlFor="harvest-notes" className="form-label">Notes</label>
            <textarea
              id="harvest-notes"
              value={harvestForm.notes}
              onChange={(e) => setHarvestForm((f) => ({ ...f, notes: e.target.value }))}
              className="form-input"
              rows={2}
              placeholder="Observations…"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setHarvestModal(null)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={harvestSaving} className="btn-primary flex-1">
              {harvestSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// Vue mensuelle
function MonthView({ currentDate, events, selectedDay, onDayClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: fr });
  const calEnd = endOfWeek(monthEnd, { locale: fr });

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div>
      {/* En-têtes des jours */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden" role="grid" aria-label={`Calendrier de ${format(currentDate, 'MMMM yyyy', { locale: fr })}`}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              role="gridcell"
              aria-label={`${format(day, 'd MMMM yyyy', { locale: fr })}${dayEvents.length > 0 ? `, ${dayEvents.length} événement(s)` : ''}`}
              onClick={() => onDayClick(day)}
              className={[
                'min-h-[80px] p-1.5 text-left transition-colors',
                isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                isSelected ? 'ring-2 ring-inset ring-[#1B5E20]' : '',
                'hover:bg-green-50',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1',
                  isDayToday
                    ? 'bg-[#1B5E20] text-white'
                    : isCurrentMonth
                    ? 'text-gray-900'
                    : 'text-gray-400',
                ].join(' ')}
              >
                {format(day, 'd')}
              </span>

              {/* Points d'événements */}
              <div className="hidden sm:flex flex-wrap gap-0.5 mt-1">
                {dayEvents.slice(0, 3).map((e, i) => (
                  <EventDot key={i} type={e.type} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{dayEvents.length - 3}</span>
                )}
              </div>

              {/* Pills d'événements sur grand écran */}
              <div className="hidden md:block space-y-0.5 mt-1">
                {dayEvents.slice(0, 2).map((e, i) => (
                  <EventPill key={i} event={e} />
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{dayEvents.length - 2} autres</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Vue hebdomadaire
function WeekView({ currentDate, events, onDayClick }) {
  const weekStart = startOfWeek(currentDate, { locale: fr });
  const weekEnd = endOfWeek(currentDate, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="grid grid-cols-7 gap-3" role="grid" aria-label={`Semaine du ${format(weekStart, 'd MMM', { locale: fr })}`}>
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day));
        const isDayToday = isToday(day);

        return (
          <button
            key={day.toISOString()}
            role="gridcell"
            aria-label={`${format(day, 'EEEE d MMMM', { locale: fr })}`}
            onClick={() => onDayClick(day)}
            className="card p-3 text-left hover:shadow-md transition-shadow min-h-[160px] flex flex-col"
          >
            <div className="flex flex-col items-center mb-2">
              <span className="text-xs text-gray-500 capitalize">
                {format(day, 'EEE', { locale: fr })}
              </span>
              <span
                className={[
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  isDayToday ? 'bg-[#1B5E20] text-white' : 'text-gray-800',
                ].join(' ')}
              >
                {format(day, 'd')}
              </span>
            </div>

            <div className="space-y-1 flex-1">
              {dayEvents.map((event, i) => (
                <EventPill key={i} event={event} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  const { activeSeason } = useSeason();

  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!activeSeason?.id) return;
    setLoading(true);
    try {
      const res = await api.get('/calendar/events', {
        params: {
          season_id: activeSeason.id,
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        },
      });
      setEvents(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement du calendrier');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id, currentDate.getFullYear(), currentDate.getMonth()]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const navigatePrev = () => {
    setCurrentDate((d) =>
      viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)
    );
  };

  const navigateNext = () => {
    setCurrentDate((d) =>
      viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)
    );
  };

  const periodLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: fr })
      : `Semaine du ${format(startOfWeek(currentDate, { locale: fr }), 'd MMM', { locale: fr })}`;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">📅 Calendrier</h1>
      </div>

      {/* Barre de navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-5">
        {/* Navigation mois/semaine */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigatePrev}
            className="btn-ghost p-2"
            aria-label={`Période précédente`}
          >
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-base font-semibold text-gray-800 capitalize w-40 text-center">
            {periodLabel}
          </h2>
          <button
            onClick={navigateNext}
            className="btn-ghost p-2"
            aria-label="Période suivante"
          >
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Basculer la vue */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg" role="group" aria-label="Mode d'affichage du calendrier">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'month' ? 'bg-white text-[#1B5E20] shadow-sm' : 'text-gray-600'}`}
            aria-pressed={viewMode === 'month'}
          >
            Mois
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-[#1B5E20] shadow-sm' : 'text-gray-600'}`}
            aria-pressed={viewMode === 'week'}
          >
            Semaine
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 mb-4" role="list" aria-label="Légende des types d'événements">
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600" role="listitem">
            <span className={`h-3 w-3 rounded-full ${EVENT_COLORS[type]}`} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      {/* Calendrier */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          events={events}
          selectedDay={selectedDay}
          onDayClick={(day) => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          events={events}
          onDayClick={(day) => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
        />
      )}

      {/* Panneau latéral jour sélectionné */}
      {selectedDay && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setSelectedDay(null)}
            aria-hidden="true"
          />
          <DayPanel
            date={selectedDay}
            events={events}
            onClose={() => setSelectedDay(null)}
            onRefresh={fetchEvents}
          />
        </>
      )}
    </div>
  );
}
