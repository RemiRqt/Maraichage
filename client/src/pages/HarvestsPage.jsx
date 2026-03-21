import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, eachWeekOfInterval, isWithinInterval, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import HarvestForm from '../components/forms/HarvestForm';
import { getSpeciesIcon } from '../utils/speciesIcons';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Affichage d'étoiles de qualité
function QualityStars({ quality }) {
  return (
    <div className="flex gap-0.5" aria-label={`Qualité : ${quality}/5`}>
      {[1, 2, 3, 4, 5].map((star) =>
        star <= quality ? (
          <StarSolid key={star} className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
        ) : (
          <StarIcon key={star} className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />
        )
      )}
    </div>
  );
}

// Onglet liste des saisies
function SaisiesTab({ seasonId }) {
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHarvests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/harvests', { params: { season_id: seasonId } });
      setHarvests(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement des récoltes');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => { fetchHarvests(); }, [fetchHarvests]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/harvests/${deleteTarget.id}`);
      toast.success('Récolte supprimée');
      setDeleteTarget(null);
      fetchHarvests();
    } catch {
      toast.error('Impossible de supprimer cette récolte');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalKg = harvests.reduce((sum, h) => sum + parseFloat(h.quantityKg || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-600">
          Total : <span className="font-bold text-gray-900">{totalKg.toFixed(2)} kg</span>
        </p>
        <button
          onClick={() => { setEditingHarvest(null); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Saisir une récolte</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : harvests.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🥬</p>
          <p>Aucune récolte enregistrée</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm" aria-label="Liste des récoltes">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Culture</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Quantité</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Qualité</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{h.planting?.cultivar?.name}</p>
                    <p className="text-xs text-gray-400">{h.planting?.bed?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {h.date
                      ? format(parseISO(h.date), 'd MMM yyyy', { locale: fr })
                      : '–'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {h.quantityKg} kg
                  </td>
                  <td className="px-4 py-3">
                    <QualityStars quality={h.qualityRating} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingHarvest(h); setModalOpen(true); }}
                      className="btn-ghost p-1.5 mr-1"
                      aria-label={`Modifier la récolte du ${h.date}`}
                    >
                      <PencilIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(h)}
                      className="btn-ghost p-1.5 text-red-500"
                      aria-label={`Supprimer la récolte du ${h.date}`}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingHarvest ? 'Modifier la récolte' : 'Saisir une récolte'}
      >
        <HarvestForm
          harvest={editingHarvest}
          seasonId={seasonId}
          onSuccess={() => { setModalOpen(false); fetchHarvests(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la récolte"
        message="Supprimer cette récolte ? Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={deleteLoading}
      />
    </div>
  );
}

// Onglet bilan
function BilanTab({ seasonId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/harvests/summary', { params: { season_id: seasonId } });
        setData(res.data || []);
      } catch {
        toast.error('Erreur lors du chargement du bilan');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [seasonId]);

  const totalKg = data.reduce((sum, d) => sum + parseFloat(d.totalHarvestedKg || 0), 0);

  const chartData = {
    labels: data.map((d) => d.cultivar?.name),
    datasets: [
      {
        label: 'Réel (kg)',
        data: data.map((d) => d.totalHarvestedKg),
        backgroundColor: '#4ade80',
        borderRadius: 4,
      },
      {
        label: 'Prévisionnel (kg)',
        data: data.map((d) => d.totalExpectedYieldKg),
        backgroundColor: '#86efac',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Récoltes réelles vs prévisionnelles par cultivar' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'kg' } },
    },
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI total */}
          <div className="card p-5 flex items-center gap-4">
            <span className="text-4xl" aria-hidden="true">🥬</span>
            <div>
              <p className="text-sm text-gray-500">Total récolté cette saison</p>
              <p className="text-3xl font-bold text-gray-900">{totalKg.toFixed(1)} kg</p>
            </div>
          </div>

          {/* Graphique */}
          {data.length > 0 && (
            <div className="card p-5">
              <Bar data={chartData} options={chartOptions} aria-label="Graphique des récoltes par cultivar" />
            </div>
          )}

          {/* Tableau récapitulatif */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm" aria-label="Tableau récapitulatif des récoltes">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cultivar</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Réel (kg)</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Prévisionnel (kg)</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Taux</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => {
                  const rate = d.totalExpectedYieldKg ? ((d.totalHarvestedKg / d.totalExpectedYieldKg) * 100).toFixed(0) : null;
                  return (
                    <tr key={d.cultivar?.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{d.cultivar?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{d.totalHarvestedKg?.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{d.totalExpectedYieldKg?.toFixed(1) || '–'}</td>
                      <td className="px-4 py-3 text-right">
                        {rate && (
                          <span className={`badge text-xs ${Number(rate) >= 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {rate}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Onglet prévisionnel hebdomadaire
function PrevisionnelTab({ seasonId }) {
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('species'); // 'species' | 'cultivar'
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);

  useEffect(() => {
    if (!seasonId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/plantings', { params: { season_id: seasonId } });
        setPlantings(res.data || []);
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [seasonId]);

  // Calculer toutes les semaines avec prévisions
  const forecast = useMemo(() => {
    const withHarvest = plantings.filter((p) => p.expectedHarvestDate);
    if (withHarvest.length === 0) return { weeks: [], totals: {} };

    const dates = withHarvest.map((p) => parseISO(p.expectedHarvestDate));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Calculer la dernière fin de récolte possible
    let latestEnd = maxDate;
    withHarvest.forEach((p) => {
      const cs = p.cultivar?.species?.cultureSheet;
      const hw = cs?.transplantChart?.harvestWindowDays || cs?.directSowChart?.harvestWindowDays || 14;
      const end = addDays(parseISO(p.expectedHarvestDate), hw);
      if (end > latestEnd) latestEnd = end;
    });

    const weekStarts = eachWeekOfInterval(
      { start: startOfWeek(minDate, { locale: fr }), end: latestEnd },
      { locale: fr }
    );

    const weeks = [];
    const totals = {}; // totaux globaux par espèce et par cultivar

    for (const ws of weekStarts) {
      const we = endOfWeek(ws, { locale: fr });
      const items = [];
      let weekTotalKg = 0;

      for (const p of withHarvest) {
        const harvestStart = parseISO(p.expectedHarvestDate);
        const cs = p.cultivar?.species?.cultureSheet;
        const harvestDays = cs?.transplantChart?.harvestWindowDays || cs?.directSowChart?.harvestWindowDays || 14;
        const harvestEnd = addDays(harvestStart, harvestDays);

        const overlapStart = ws > harvestStart ? ws : harvestStart;
        const overlapEnd = we < harvestEnd ? we : harvestEnd;
        if (overlapStart > overlapEnd) continue;

        const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
        const totalExpected = parseFloat(p.expectedYieldKg) || 0;
        const dailyKg = harvestDays > 0 ? totalExpected / harvestDays : 0;
        const weekKg = parseFloat((dailyKg * Math.min(overlapDays, 7)).toFixed(2));
        if (weekKg <= 0) continue;

        const speciesName = p.cultivar?.species?.name || p.cultivar?.name || '?';
        const cultivarName = p.cultivar?.name || '?';

        items.push({
          plantingId: p.id,
          speciesName,
          cultivarName,
          bedName: p.bed?.name || '',
          weekKg,
          totalExpectedKg: totalExpected,
          harvestDays,
          isStartWeek: isWithinInterval(harvestStart, { start: ws, end: we }),
        });
        weekTotalKg += weekKg;

        // Totaux globaux
        if (!totals[speciesName]) totals[speciesName] = { species: 0, cultivars: {} };
        totals[speciesName].species += weekKg;
        if (!totals[speciesName].cultivars[cultivarName]) totals[speciesName].cultivars[cultivarName] = 0;
        totals[speciesName].cultivars[cultivarName] += weekKg;
      }

      weeks.push({
        weekStart: ws,
        label: `S${format(ws, 'ww', { locale: fr })}`,
        sublabel: `${format(ws, 'd MMM', { locale: fr })} – ${format(we, 'd MMM', { locale: fr })}`,
        items,
        totalKg: weekTotalKg,
      });
    }

    return { weeks, totals };
  }, [plantings]);

  // Agréger les items de la semaine courante par espèce ou cultivar
  const currentWeek = forecast.weeks[currentWeekIdx] || null;

  const aggregatedItems = useMemo(() => {
    if (!currentWeek) return [];
    const map = {};
    currentWeek.items.forEach((item) => {
      const key = groupBy === 'species' ? item.speciesName : `${item.speciesName}|${item.cultivarName}`;
      if (!map[key]) {
        map[key] = {
          speciesName: item.speciesName,
          cultivarName: groupBy === 'cultivar' ? item.cultivarName : null,
          beds: [],
          weekKg: 0,
          isStartWeek: false,
        };
      }
      map[key].weekKg += item.weekKg;
      if (item.bedName && !map[key].beds.includes(item.bedName)) map[key].beds.push(item.bedName);
      if (item.isStartWeek) map[key].isStartWeek = true;
    });
    return Object.values(map).sort((a, b) => b.weekKg - a.weekKg);
  }, [currentWeek, groupBy]);

  const grandTotalKg = Object.values(forecast.totals).reduce((s, t) => s + t.species, 0);

  // Trouver la première semaine avec des récoltes pour l'initialisation
  useEffect(() => {
    if (forecast.weeks.length > 0 && currentWeekIdx === 0) {
      const firstNonEmpty = forecast.weeks.findIndex((w) => w.items.length > 0);
      if (firstNonEmpty > 0) setCurrentWeekIdx(firstNonEmpty);
    }
  }, [forecast.weeks]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  if (forecast.weeks.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-4xl mb-3">📊</p>
        <p>Aucune récolte prévisionnelle</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Résumé saison */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévision saison</h3>
          <span className="text-lg font-bold text-gray-900">{grandTotalKg.toFixed(0)} kg</span>
        </div>
        {/* Toggle espèce / cultivar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
            <button
              onClick={() => setGroupBy('species')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${groupBy === 'species' ? 'bg-white text-[#1B5E20] shadow-sm font-semibold' : 'text-gray-500'}`}
            >
              Par espèce
            </button>
            <button
              onClick={() => setGroupBy('cultivar')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${groupBy === 'cultivar' ? 'bg-white text-[#1B5E20] shadow-sm font-semibold' : 'text-gray-500'}`}
            >
              Par cultivar
            </button>
          </div>
        </div>
        {/* Barres par espèce/cultivar */}
        <div className="space-y-1.5">
          {(groupBy === 'species'
            ? Object.entries(forecast.totals).map(([name, t]) => ({ name, kg: t.species }))
            : Object.entries(forecast.totals).flatMap(([sp, t]) =>
                Object.entries(t.cultivars).map(([cv, kg]) => ({ name: cv, species: sp, kg }))
              )
          )
            .sort((a, b) => b.kg - a.kg)
            .slice(0, 12)
            .map((item) => {
              const pct = grandTotalKg > 0 ? (item.kg / grandTotalKg) * 100 : 0;
              return (
                <div key={item.name + (item.species || '')} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{getSpeciesIcon(item.species || item.name)}</span>
                  <span className="text-xs text-gray-700 w-32 truncate">{item.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 w-14 text-right">{item.kg.toFixed(0)} kg</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Timeline des semaines */}
      <div className="card p-3 sm:p-4 overflow-x-auto">
        <div className="flex gap-1 sm:gap-1.5 min-w-max">
          {forecast.weeks.map((w, idx) => {
            const hasItems = w.items.length > 0;
            const isCurrent = idx === currentWeekIdx;
            const maxWeekKg = Math.max(...forecast.weeks.map((wk) => wk.totalKg), 1);
            const barH = hasItems ? Math.max(6, Math.round((w.totalKg / maxWeekKg) * 28)) : 2;

            return (
              <button
                key={idx}
                onClick={() => setCurrentWeekIdx(idx)}
                className={[
                  'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-[44px]',
                  isCurrent ? 'bg-green-100 ring-1 ring-green-400' : hasItems ? 'hover:bg-gray-100' : 'opacity-25',
                ].join(' ')}
                title={`${w.sublabel} — ${w.totalKg.toFixed(1)} kg`}
              >
                <div className="w-6 bg-gray-100 rounded-sm overflow-hidden flex items-end" style={{ height: '32px' }}>
                  <div className={`w-full rounded-sm ${isCurrent ? 'bg-green-600' : 'bg-green-400'}`} style={{ height: `${barH}px` }} />
                </div>
                <span className={`text-[11px] leading-tight ${isCurrent ? 'font-bold text-green-800' : 'text-gray-500'}`}>{w.label}</span>
                {hasItems && (
                  <span className={`text-[9px] leading-none ${isCurrent ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                    {w.totalKg.toFixed(0)}kg
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Semaine sélectionnée */}
      {currentWeek && (
        <div className="card overflow-hidden">
          {/* Navigation semaine */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <button
              onClick={() => setCurrentWeekIdx(Math.max(0, currentWeekIdx - 1))}
              disabled={currentWeekIdx === 0}
              className="btn-ghost p-1 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{currentWeek.label} · {currentWeek.sublabel}</p>
              <p className="text-lg font-bold text-green-700">{currentWeek.totalKg.toFixed(1)} kg attendus</p>
            </div>
            <button
              onClick={() => setCurrentWeekIdx(Math.min(forecast.weeks.length - 1, currentWeekIdx + 1))}
              disabled={currentWeekIdx >= forecast.weeks.length - 1}
              className="btn-ghost p-1 disabled:opacity-30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Contenu */}
          {currentWeek.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune récolte cette semaine</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {aggregatedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xl">{getSpeciesIcon(item.speciesName)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {groupBy === 'species' ? item.speciesName : item.cultivarName}
                      </span>
                      {item.isStartWeek && (
                        <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">Début</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{item.beds.join(', ')}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{item.weekKg.toFixed(1)} kg</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HarvestsPage() {
  const { activeSeason } = useSeason();
  const [activeTab, setActiveTab] = useState('previsionnel');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">🥬 Récoltes</h1>
      </div>

      {/* Onglets */}
      <div
        className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4 sm:mb-6 w-full sm:w-fit overflow-x-auto"
        role="tablist"
        aria-label="Onglets récoltes"
      >
        {[
          { id: 'previsionnel', label: 'Prévisionnel' },
          { id: 'saisies', label: 'Saisies' },
          { id: 'bilan', label: 'Bilan' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.id
                ? 'bg-white text-[#1B5E20] shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'previsionnel' && <PrevisionnelTab seasonId={activeSeason?.id} />}
        {activeTab === 'saisies' && <SaisiesTab seasonId={activeSeason?.id} />}
        {activeTab === 'bilan' && <BilanTab seasonId={activeSeason?.id} />}
      </div>
    </div>
  );
}
