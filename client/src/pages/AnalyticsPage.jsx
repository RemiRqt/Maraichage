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
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } },
};

// Carte KPI
function KpiCard({ label, value, unit = '', icon }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900">
        {value !== undefined && value !== null ? value : '–'}
        {unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// Onglet par culture
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

  const chartData = {
    labels: data.map((d) => d.cultivar?.name),
    datasets: [
      {
        label: 'Récolte réelle (kg)',
        data: data.map((d) => d.totalKgRecoltes),
        backgroundColor: '#4ade80',
        borderRadius: 4,
      },
      {
        label: 'Prévisionnel (kg)',
        data: data.map((d) => d.totalKgPrevus),
        backgroundColor: '#86efac',
        borderRadius: 4,
      },
    ],
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-5">
      {data.length > 0 && (
        <div className="card p-5">
          <Bar
            data={chartData}
            options={{
              ...CHART_OPTIONS_BASE,
              plugins: {
                ...CHART_OPTIONS_BASE.plugins,
                title: { display: true, text: 'Récoltes réelles vs prévisionnelles (kg)' },
              },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'kg' } } },
            }}
            aria-label="Graphique des récoltes par culture"
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm" aria-label="Tableau analytique par culture">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Cultivar</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Récolte (kg)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Prévisionnel (kg)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Heures</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Taux réalisation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.cultivar?.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.cultivar?.name}</td>
                <td className="px-4 py-3 text-right">{d.totalKgRecoltes?.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{d.totalKgPrevus?.toFixed(1) || '–'}</td>
                <td className="px-4 py-3 text-right">{d.totalHeuresTravaillees?.toFixed(1) || '–'}</td>
                <td className="px-4 py-3 text-right">
                  {d.tauxRendementPct != null && (
                    <span className={`badge text-xs ${d.tauxRendementPct >= 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {d.tauxRendementPct}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Onglet par planche
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

  const chartData = {
    labels: data.map((d) => d.bed?.name),
    datasets: [
      {
        label: 'Rendement (kg/m²)',
        data: data.map((d) => d.kgParM2),
        backgroundColor: '#60a5fa',
        borderRadius: 4,
      },
    ],
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-5">
      {data.length > 0 && (
        <div className="card p-5">
          <Bar
            data={chartData}
            options={{
              ...CHART_OPTIONS_BASE,
              plugins: {
                ...CHART_OPTIONS_BASE.plugins,
                title: { display: true, text: 'Rendement par planche (kg/m²)' },
              },
              scales: { y: { beginAtZero: true, title: { display: true, text: 'kg/m²' } } },
            }}
            aria-label="Graphique du rendement par planche"
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm" aria-label="Tableau analytique par planche">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Planche</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Rendement (kg/m²)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Récolté (kg)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Occupation (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.bed?.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{d.bed?.name}</td>
                <td className="px-4 py-3 text-right">{d.kgParM2?.toFixed(2) || '–'}</td>
                <td className="px-4 py-3 text-right">{d.totalKgRecoltes?.toFixed(1) || '–'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`badge text-xs ${d.occupationPct >= 70 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d.occupationPct?.toFixed(0) || 0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Onglet saison
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total récolté" value={kpis.totalKgRecoltes?.toFixed(1)} unit="kg" icon="🥬" />
        <KpiCard label="Heures de travail" value={kpis.totalHeuresTravaillees?.toFixed(1)} unit="h" icon="⏱️" />
        <KpiCard label="Plantations" value={kpis.nombrePlantations} icon="🌱" />
      </div>

      {top5.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top 5 cultivars par rendement</h3>
          <ul className="space-y-2">
            {top5.map((c, i) => (
              <li key={c.cultivarId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-gray-400 w-5">{i + 1}.</span>
                  <span className="font-medium text-gray-900">{c.nom}</span>
                </span>
                <span className="text-gray-600">{c.totalKg?.toFixed(1)} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {kpis.plantationsParStatut && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Plantations par statut</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(kpis.plantationsParStatut).map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{status.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Onglet comparaison
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="season-a" className="form-label">Saison A</label>
          <select
            id="season-a"
            value={seasonA}
            onChange={(e) => setSeasonA(e.target.value)}
            className="form-input"
          >
            <option value="">Choisir une saison…</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="season-b" className="form-label">Saison B</label>
          <select
            id="season-b"
            value={seasonB}
            onChange={(e) => setSeasonB(e.target.value)}
            className="form-input"
          >
            <option value="">Choisir une saison…</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={handleCompare} disabled={loading} className="btn-primary">
          {loading ? 'Comparaison…' : 'Comparer'}
        </button>
      </div>

      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: seasonAName, data: comparison.saisonA },
            { label: seasonBName, data: comparison.saisonB },
          ].map(({ label, data }) => (
            <div key={label} className="card p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">{label}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total récolté</span>
                  <span className="font-semibold">{data?.totalKgRecoltes?.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Heures de travail</span>
                  <span className="font-semibold">{data?.totalHeuresTravaillees?.toFixed(1)} h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plantations</span>
                  <span className="font-semibold">{data?.nombrePlantations ?? '–'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'culture', label: 'Par culture' },
  { id: 'planche', label: 'Par planche' },
  { id: 'saison', label: 'Saison' },
  { id: 'comparaison', label: 'Comparaison' },
];

export default function AnalyticsPage() {
  const { activeSeason, seasons } = useSeason();
  const [activeTab, setActiveTab] = useState('culture');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title">📊 Analytique</h1>
      </div>

      <div
        className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto w-fit"
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
              'px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
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
