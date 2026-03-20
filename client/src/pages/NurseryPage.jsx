import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import NurseryBatchForm from '../components/forms/NurseryBatchForm';
import { getSpeciesIcon } from '../utils/speciesIcons';

const STATUS_PROGRESSION = {
  SEME: 'EN_GERMINATION',
  EN_GERMINATION: 'EN_CROISSANCE',
  EN_CROISSANCE: 'PRET_AU_REPIQUAGE',
  PRET_AU_REPIQUAGE: 'TRANSPLANTE',
};

const STATUS_META = {
  SEME:                { label: 'Semé',              color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🌰' },
  EN_GERMINATION:      { label: 'En germination',    color: 'bg-lime-100 text-lime-800 border-lime-300',       icon: '🌱' },
  EN_CROISSANCE:       { label: 'En croissance',     color: 'bg-green-100 text-green-800 border-green-300',    icon: '🌿' },
  PRET_AU_REPIQUAGE:   { label: 'Prêt au repiquage', color: 'bg-blue-100 text-blue-800 border-blue-300',      icon: '📦' },
  TRANSPLANTE:         { label: 'Transplanté',       color: 'bg-gray-100 text-gray-600 border-gray-300',      icon: '✅' },
  ECHEC:               { label: 'Échec',             color: 'bg-red-100 text-red-700 border-red-300',         icon: '❌' },
};

function ProgressTimeline({ batch }) {
  const sowDate = batch.sowingDate ? parseISO(batch.sowingDate) : null;
  const transplantDate = batch.expectedTransplantDate ? parseISO(batch.expectedTransplantDate) : null;
  if (!sowDate) return null;

  const today = new Date();
  const daysElapsed = differenceInDays(today, sowDate);
  const totalDays = transplantDate ? differenceInDays(transplantDate, sowDate) : null;
  const pct = totalDays && totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : null;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Semis {format(sowDate, 'd MMM', { locale: fr })}</span>
        {transplantDate && <span>Repiquage {format(transplantDate, 'd MMM', { locale: fr })}</span>}
      </div>
      {pct !== null && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-blue-500' : 'bg-green-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        J+{daysElapsed}{totalDays ? ` / ${totalDays}j` : ''}
        {pct !== null && pct >= 100 && ' — Prêt !'}
      </p>
    </div>
  );
}

function GerminationBar({ rate }) {
  const pct = Math.min(100, Math.max(0, parseFloat(rate) || 0));
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

function BatchCard({ batch, onAdvance, onGermination, advancingId }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[batch.status] || STATUS_META.SEME;
  const nextStatus = STATUS_PROGRESSION[batch.status];
  const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;
  const speciesName = batch.cultivar?.species?.name;
  const cultivarName = batch.cultivar?.name;
  const sowDate = batch.sowingDate ? parseISO(batch.sowingDate) : null;
  const daysElapsed = sowDate ? differenceInDays(new Date(), sowDate) : 0;

  return (
    <div className={`card overflow-hidden border ${meta.color.split(' ').find(c => c.startsWith('border-'))}`}>
      {/* En-tête */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-2xl">{getSpeciesIcon(speciesName) || meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{cultivarName}</p>
            {speciesName && speciesName !== cultivarName && (
              <span className="text-xs text-gray-400">({speciesName})</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span>{batch.containerCount} × {batch.containerType}</span>
            <span>{batch.totalSeedsSown} graines</span>
            {sowDate && <span>J+{daysElapsed}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Germination rapide */}
          {batch.germinationRate != null && parseFloat(batch.germinationRate) > 0 && (
            <div className="w-16 hidden sm:block">
              <GerminationBar rate={batch.germinationRate} />
            </div>
          )}

          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${meta.color}`}>
            {meta.label}
          </span>

          {/* Avancer */}
          {nextMeta && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdvance(batch); }}
              disabled={advancingId === batch.id}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-white border border-gray-200 hover:border-green-400 hover:text-green-700 transition-colors"
              title={`Passer à "${nextMeta.label}"`}
            >
              {advancingId === batch.id ? '…' : (
                <>
                  {nextMeta.icon}
                  <ArrowRightIcon className="h-3 w-3" />
                </>
              )}
            </button>
          )}

          {expanded
            ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          }
        </div>
      </div>

      {/* Détails dépliés */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/30">
          {/* Timeline */}
          <ProgressTimeline batch={batch} />

          {/* Infos détaillées */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Date semis</p>
              <p className="font-medium text-gray-800">
                {sowDate ? format(sowDate, 'd MMM yyyy', { locale: fr }) : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Repiquage prévu</p>
              <p className="font-medium text-gray-800">
                {batch.expectedTransplantDate
                  ? format(parseISO(batch.expectedTransplantDate), 'd MMM yyyy', { locale: fr })
                  : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Contenant</p>
              <p className="font-medium text-gray-800">
                {batch.containerCount} × {batch.containerType}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Plants totaux</p>
              <p className="font-medium text-gray-800">{batch.totalSeedsSown}</p>
            </div>
          </div>

          {/* Germination */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Germination</p>
              <GerminationBar rate={batch.germinationRate} />
            </div>
            <button
              onClick={() => onGermination(batch)}
              className="text-xs text-green-700 hover:text-green-900 font-medium border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50 transition-colors"
            >
              Mettre à jour
            </button>
          </div>

          {/* Planche associée */}
          {batch.planting?.bed && (
            <div className="text-xs text-gray-400">
              Planche : <span className="font-medium text-gray-700">{batch.planting.bed.name}</span>
              {batch.planting.cultivar && (
                <span> — {batch.planting.cultivar.name}</span>
              )}
            </div>
          )}

          {/* Notes */}
          {batch.notes && (
            <p className="text-xs text-gray-500 italic">{batch.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NurseryPage() {
  const { activeSeason } = useSeason();

  const [batches, setBatches] = useState([]);
  const [cultivars, setCultivars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [germModalBatch, setGermModalBatch] = useState(null);
  const [germRate, setGermRate] = useState('');
  const [advancingId, setAdvancingId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!activeSeason?.id) return;
    setLoading(true);
    try {
      const [batchesRes, cultivarsRes] = await Promise.all([
        api.get('/nursery', {
          params: {
            season_id: activeSeason.id,
            status: filterStatus || undefined,
          },
        }),
        api.get('/cultivars'),
      ]);
      setBatches(batchesRes.data || []);
      setCultivars(cultivarsRes.data || []);
    } catch {
      toast.error('Erreur lors du chargement de la pépinière');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats par statut
  const statusCounts = useMemo(() => {
    const counts = {};
    batches.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return counts;
  }, [batches]);

  const handleAdvanceStatus = async (batch) => {
    const nextStatus = STATUS_PROGRESSION[batch.status];
    if (!nextStatus) return;
    setAdvancingId(batch.id);
    try {
      await api.patch(`/nursery/${batch.id}/status`, { status: nextStatus });
      toast.success(`Lot avancé à "${STATUS_META[nextStatus]?.label}"`);
      fetchData();
    } catch {
      toast.error("Impossible de mettre à jour le statut");
    } finally {
      setAdvancingId(null);
    }
  };

  const handleUpdateGermination = async (e) => {
    e.preventDefault();
    if (!germModalBatch) return;
    try {
      await api.put(`/nursery/${germModalBatch.id}`, {
        germinationRate: Number(germRate),
      });
      toast.success('Taux de germination mis à jour');
      setGermModalBatch(null);
      fetchData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Grouper les lots par statut pour la vue kanban
  const statusOrder = ['SEME', 'EN_GERMINATION', 'EN_CROISSANCE', 'PRET_AU_REPIQUAGE', 'TRANSPLANTE'];
  const activeStatuses = statusOrder.filter((s) => statusCounts[s] > 0 || s === filterStatus);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-6">
        <h1 className="page-title">🌿 Pépinière</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Nouveau lot
        </button>
      </div>

      {/* Stats cliquables */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <button
            onClick={() => setFilterStatus('')}
            className={`card p-3 text-center hover:shadow-md transition-shadow ${!filterStatus ? 'ring-2 ring-green-500' : ''}`}
          >
            <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </button>
          {statusOrder.slice(0, 4).map((st) => {
            const m = STATUS_META[st];
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(filterStatus === st ? '' : st)}
                className={`card p-3 text-center hover:shadow-md transition-shadow ${filterStatus === st ? 'ring-2 ring-green-500' : ''}`}
              >
                <p className="text-2xl font-bold text-gray-900">
                  <span className="mr-1">{m.icon}</span>{statusCounts[st] || 0}
                </p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Liste des lots */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : batches.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🌱</p>
          <p>Aucun lot de pépinière {filterStatus ? `avec le statut "${STATUS_META[filterStatus]?.label}"` : 'pour cette saison'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onAdvance={handleAdvanceStatus}
              onGermination={(b) => { setGermModalBatch(b); setGermRate(String(parseFloat(b.germinationRate) || 0)); }}
              advancingId={advancingId}
            />
          ))}
        </div>
      )}

      {/* Modal nouveau lot */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau lot de pépinière" size="lg">
        <NurseryBatchForm
          onSuccess={() => { setModalOpen(false); fetchData(); toast.success('Lot créé'); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Modal germination */}
      <Modal isOpen={!!germModalBatch} onClose={() => setGermModalBatch(null)} title="Taux de germination" size="sm">
        <form onSubmit={handleUpdateGermination} className="space-y-4">
          <p className="text-sm text-gray-600">
            Lot : <strong>{germModalBatch?.cultivar?.name}</strong>
            <span className="text-gray-400 ml-1">({germModalBatch?.totalSeedsSown} graines semées)</span>
          </p>
          <div>
            <label htmlFor="germ-rate" className="form-label">Taux de germination (%)</label>
            <input
              id="germ-rate"
              type="number"
              min="0"
              max="100"
              value={germRate}
              onChange={(e) => setGermRate(e.target.value)}
              className="form-input"
            />
          </div>
          {germRate && germModalBatch?.totalSeedsSown > 0 && (
            <p className="text-xs text-gray-400">
              ≈ {Math.round((parseFloat(germRate) / 100) * germModalBatch.totalSeedsSown)} plants viables
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setGermModalBatch(null)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">Enregistrer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
