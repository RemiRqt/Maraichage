import { useState, useEffect } from 'react';
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
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSpeciesIcon } from '../utils/speciesIcons';

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

const CHART_OPTIONS_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
  },
  scales: { y: { beginAtZero: true } },
};

// Carte KPI
function KpiCard({ label, value, unit = '', icon, color = 'green' }) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${colors[color] || colors.green}`}>
      <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
        {value !== undefined && value !== null ? value : '–'}
        {unit && <span className="text-xs sm:text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// Barre de progression horizontale
function ProgressBar({ value, max, color = 'bg-green-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Onglet par culture ───────────────────────────────────────────────────────
function ParCultureTab({ seasonId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/cultures', { params: { season_id: seasonId } });
        setData(res.data || []);
      } catch {
        toast.error('Erreur chargement analytics par culture');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [seasonId]);

  const maxKg = Math.max(...data.map((d) => Math.max(d.totalKgRecoltes || 0, d.totalKgPrevus || 0)), 1);

  const chartData = {
    labels: data.map((d) => d.cultivar?.name),
    datasets: [
      { label: 'Récolte réelle (kg)', data: data.map((d) => d.totalKgRecoltes), backgroundColor: '#4ade80', borderRadius: 4 },
      { label: 'Prévisionnel (kg)', data: data.map((d) => d.totalKgPrevus), backgroundColor: '#86efac', borderRadius: 4 },
    ],
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-3xl mb-2">📊</p>
        <p>Aucune donnée pour cette saison</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Graphique — masqué mobile, visible tablette+ */}
      <div className="card p-3 sm:p-5 hidden sm:block">
        <div style={{ height: '300px' }}>
          <Bar
            data={chartData}
            options={{
              ...CHART_OPTIONS_BASE,
              plugins: {
                ...CHART_OPTIONS_BASE.plugins,
                title: { display: true, text: 'Récoltes réelles vs prévisionnelles (kg)', font: { size: 13 } },
              },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'kg' } } },
            }}
          />
        </div>
      </div>

      {/* Liste mobile-friendly */}
      <div className="space-y-2">
        {data.map((d) => {
          const taux = d.tauxRendementPct;
          const speciesName = d.cultivar?.species?.name || d.cultivar?.name;
          return (
            <div key={d.cultivar?.id} className="card p-3 sm:p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-lg">{getSpeciesIcon(speciesName)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{d.cultivar?.name}</p>
                  <ProgressBar value={d.totalKgRecoltes || 0} max={maxKg} />
                </div>
                {taux != null && (
                  <span className={`badge text-xs flex-shrink-0 ${taux >= 100 ? 'bg-green-100 text-green-700' : taux >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {taux}%
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">Récolté</p>
                  <p className="text-sm font-bold text-gray-900">{d.totalKgRecoltes?.toFixed(1) || '–'} <span className="text-xs font-normal text-gray-400">kg</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Prévu</p>
                  <p className="text-sm font-bold text-gray-500">{d.totalKgPrevus?.toFixed(1) || '–'} <span className="text-xs font-normal text-gray-400">kg</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Heures</p>
                  <p className="text-sm font-bold text-gray-700">{d.totalHeuresTravaillees?.toFixed(1) || '–'} <span className="text-xs font-normal text-gray-400">h</span></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Onglet par planche ───────────────────────────────────────────────────────
function ParPlancheTab({ seasonId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/beds', { params: { season_id: seasonId } });
        setData(res.data || []);
      } catch {
        toast.error('Erreur chargement analytics par planche');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [seasonId]);

  const maxKgM2 = Math.max(...data.map((d) => d.kgParM2 || 0), 0.1);

  const chartData = {
    labels: data.map((d) => d.bed?.name),
    datasets: [
      { label: 'Rendement (kg/m²)', data: data.map((d) => d.kgParM2), backgroundColor: '#60a5fa', borderRadius: 4 },
    ],
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-3xl mb-2">📊</p>
        <p>Aucune donnée pour cette saison</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Graphique — masqué mobile */}
      <div className="card p-3 sm:p-5 hidden sm:block">
        <div style={{ height: '300px' }}>
          <Bar
            data={chartData}
            options={{
              ...CHART_OPTIONS_BASE,
              plugins: {
                ...CHART_OPTIONS_BASE.plugins,
                title: { display: true, text: 'Rendement par planche (kg/m²)', font: { size: 13 } },
              },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'kg/m²' } } },
            }}
          />
        </div>
      </div>

      {/* Liste mobile-friendly */}
      <div className="space-y-2">
        {data.map((d) => {
          const occ = d.occupationPct || 0;
          return (
            <div key={d.bed?.id} className="card p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-sm text-gray-900">{d.bed?.name}</p>
                <span className={`badge text-xs ${occ >= 70 ? 'bg-green-100 text-green-700' : occ >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {occ.toFixed(0)}% occupé
                </span>
              </div>
              <ProgressBar value={d.kgParM2 || 0} max={maxKgM2} color="bg-blue-500" />
              <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">Rendement</p>
                  <p className="text-sm font-bold text-blue-700">{d.kgParM2?.toFixed(2) || '–'} <span className="text-xs font-normal text-gray-400">kg/m²</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total récolté</p>
                  <p className="text-sm font-bold text-gray-900">{d.totalKgRecoltes?.toFixed(1) || '–'} <span className="text-xs font-normal text-gray-400">kg</span></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Onglet saison ────────────────────────────────────────────────────────────
function SaisonTab({ seasonId }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!seasonId) return;
      setLoading(true);
      try {
        const res = await api.get('/analytics/season-summary', { params: { season_id: seasonId } });
        setKpis(res.data);
      } catch {
        toast.error('Erreur chargement KPIs saison');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [seasonId]);

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!kpis) return null;

  const top5 = kpis.top5CultivarsParRendement || [];
  const maxTop = top5.length > 0 ? top5[0].totalKg : 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <KpiCard label="Total récolté" value={kpis.totalKgRecoltes?.toFixed(1)} unit="kg" icon="🥬" color="green" />
        <KpiCard label="Heures travail" value={kpis.totalHeuresTravaillees?.toFixed(1)} unit="h" icon="⏱️" color="blue" />
        <KpiCard label="Plantations" value={kpis.nombrePlantations} icon="🌱" color="purple" />
      </div>

      {top5.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 cultivars</h3>
          <div className="space-y-2.5">
            {top5.map((c, i) => (
              <div key={c.cultivarId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                    <span className="font-medium text-gray-900 truncate">{c.nom}</span>
                  </span>
                  <span className="text-gray-600 flex-shrink-0 ml-2">{c.totalKg?.toFixed(1)} kg</span>
                </div>
                <ProgressBar value={c.totalKg} max={maxTop} />
              </div>
            ))}
          </div>
        </div>
      )}

      {kpis.plantationsParStatut && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">📊 Plantations par statut</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(kpis.plantationsParStatut).map(([status, count]) => (
              <div key={status} className="text-center p-2.5 bg-gray-50 rounded-lg">
                <p className="text-lg sm:text-xl font-bold text-gray-900">{count}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 capitalize">{status.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet comparaison ───────────────────────────────────────────────────────
function ComparaisonTab({ seasons }) {
  const [seasonA, setSeasonA] = useState('');
  const [seasonB, setSeasonB] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!seasonA || !seasonB) {
      toast.error('Sélectionnez deux saisons à comparer');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/analytics/compare', {
        params: { season_a: seasonA, season_b: seasonB },
      });
      setComparison(res.data);
    } catch {
      toast.error('Erreur lors de la comparaison');
    } finally {
      setLoading(false);
    }
  };

  const seasonAName = seasons.find((s) => s.id === seasonA)?.name;
  const seasonBName = seasons.find((s) => s.id === seasonB)?.name;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="season-a" className="form-label text-xs">Saison A</label>
            <select id="season-a" value={seasonA} onChange={(e) => setSeasonA(e.target.value)} className="form-input text-sm">
              <option value="">Choisir…</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="season-b" className="form-label text-xs">Saison B</label>
            <select id="season-b" value={seasonB} onChange={(e) => setSeasonB(e.target.value)} className="form-input text-sm">
              <option value="">Choisir…</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleCompare} disabled={loading} className="btn-primary w-full text-sm">
          {loading ? 'Comparaison…' : 'Comparer'}
        </button>
      </div>

      {comparison && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: seasonAName, data: comparison.saisonA },
            { label: seasonBName, data: comparison.saisonB },
          ].map(({ label, data }) => (
            <div key={label} className="card p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{label}</h3>
              <div className="space-y-2">
                {[
                  { l: 'Total récolté', v: data?.totalKgRecoltes?.toFixed(1), u: 'kg', icon: '🥬' },
                  { l: 'Heures de travail', v: data?.totalHeuresTravaillees?.toFixed(1), u: 'h', icon: '⏱️' },
                  { l: 'Plantations', v: data?.nombrePlantations, u: '', icon: '🌱' },
                ].map((row) => (
                  <div key={row.l} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="text-xs">{row.icon}</span> {row.l}
                    </span>
                    <span className="font-semibold text-gray-900">{row.v ?? '–'} {row.u}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'saison', label: 'Saison' },
  { id: 'culture', label: 'Cultures' },
  { id: 'planche', label: 'Planches' },
  { id: 'comparaison', label: 'Comparer' },
];

export default function AnalyticsPage() {
  const { activeSeason, seasons } = useSeason();
  const [activeTab, setActiveTab] = useState('saison');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      <div className="page-header mb-4 sm:mb-5">
        <h1 className="page-title text-lg sm:text-xl">📊 Analytique</h1>
      </div>

      <div
        className="flex gap-0.5 p-1 bg-gray-100 rounded-xl mb-4 sm:mb-5 w-full sm:w-fit"
        role="tablist"
        aria-label="Onglets analytique"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap',
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
        {activeTab === 'culture' && <ParCultureTab seasonId={activeSeason?.id} />}
        {activeTab === 'planche' && <ParPlancheTab seasonId={activeSeason?.id} />}
        {activeTab === 'saison' && <SaisonTab seasonId={activeSeason?.id} />}
        {activeTab === 'comparaison' && <ComparaisonTab seasons={seasons || []} />}
      </div>
    </div>
  );
}
