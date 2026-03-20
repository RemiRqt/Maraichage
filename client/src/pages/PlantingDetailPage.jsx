import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityBadge from '../components/ui/PriorityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

// Statut suivant dans le flux
const NEXT_STATUS = {
  PLANIFIE: 'SEME',
  SEME: 'EN_CROISSANCE',
  EN_PEPINIERE: 'TRANSPLANTE',
  TRANSPLANTE: 'EN_CROISSANCE',
  EN_CROISSANCE: 'EN_RECOLTE',
  EN_RECOLTE: 'TERMINE',
};

const STATUS_LABELS_FR = {
  PLANIFIE: 'Planifié',
  SEME: 'Semé',
  EN_PEPINIERE: 'En pépinière',
  TRANSPLANTE: 'Transplanté',
  EN_CROISSANCE: 'En croissance',
  EN_RECOLTE: 'En récolte',
  TERMINE: 'Terminé',
  ECHEC: 'Échec',
};

function QualityStars({ quality }) {
  return (
    <span className="flex gap-0.5" aria-label={`Qualité : ${quality}/5`}>
      {[1, 2, 3, 4, 5].map((s) =>
        s <= quality
          ? <StarSolid key={s} className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
          : <StarIcon key={s} className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />
      )}
    </span>
  );
}

function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400';

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function PlantingDetailPage() {
  const { plantingId } = useParams();
  const navigate = useNavigate();

  const [planting, setPlanting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/plantings/${plantingId}`);
      setPlanting(res.data);
    } catch {
      toast.error('Erreur lors du chargement de la plantation');
    } finally {
      setLoading(false);
    }
  }, [plantingId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdvanceStatus = async () => {
    if (!planting) return;
    const nextStatus = NEXT_STATUS[planting.status];
    if (!nextStatus) return;

    setAdvancingStatus(true);
    try {
      await api.patch(`/plantings/${planting.id}/status`, { status: nextStatus });
      toast.success(`Statut mis à jour : ${STATUS_LABELS_FR[nextStatus]}`);
      setStatusModalOpen(false);
      fetchData();
    } catch {
      toast.error('Erreur lors du changement de statut');
    } finally {
      setAdvancingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!planting) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Plantation introuvable</p>
        <button onClick={() => navigate(-1)} className="btn-ghost mt-4">Retour</button>
      </div>
    );
  }

  const tasks = planting.tasks || [];
  const harvests = planting.harvests || [];
  const nursery = planting.nurseryBatches?.[0] || null;

  const totalHarvestedKg = harvests.reduce((sum, h) => sum + (h.quantityKg || 0), 0);
  const nextStatus = NEXT_STATUS[planting.status];

  const sowingDate = planting.sowingDate ? parseISO(planting.sowingDate) : null;
  const daysElapsed = sowingDate ? differenceInDays(new Date(), sowingDate) : 0;
  const daysToMaturity = planting.cultureSheet?.transplantChart?.daysToMaturity
    || planting.cultureSheet?.directSowChart?.daysToMaturity || 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Navigation retour */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        aria-label="Retour"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Retour
      </button>

      {/* En-tête de la plantation */}
      <div className="card p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{planting.cultivar?.name}</h1>
              <StatusBadge status={planting.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {planting.bed?.name && (
                <span>📍 <strong>{planting.bed.name}</strong></span>
              )}
              {planting.season?.name && (
                <span>📅 {planting.season.name}</span>
              )}
              {planting.sowingDate && (
                <span>
                  🌱 Semé le {format(parseISO(planting.sowingDate), 'd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          </div>

          {nextStatus && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="btn-primary flex items-center gap-2 flex-shrink-0"
              aria-label={`Passer au statut "${STATUS_LABELS_FR[nextStatus]}"`}
            >
              {STATUS_LABELS_FR[nextStatus]}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Barres de progression */}
        {daysToMaturity > 0 && (
          <div className="mt-5 space-y-3">
            <ProgressBar
              value={daysElapsed}
              max={daysToMaturity}
              label={`Croissance (${daysElapsed}j / ${daysToMaturity}j)`}
            />
            {planting.expectedYieldKg && (
              <ProgressBar
                value={totalHarvestedKg}
                max={planting.expectedYieldKg}
                label={`Récolte (${totalHarvestedKg.toFixed(1)} kg / ${planting.expectedYieldKg} kg prévus)`}
              />
            )}
          </div>
        )}
      </div>

      {/* Grille de détails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

        {/* Statistiques */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Statistiques
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Récolte prévue</span>
              <span className="font-semibold">{planting.expectedYieldKg ?? '–'} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Récolte réelle</span>
              <span className="font-semibold text-green-700">{totalHarvestedKg.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Quantité semée</span>
              <span className="font-semibold">{planting.quantityPlanted ?? '–'}</span>
            </div>
            {planting.expectedHarvestDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Récolte prévue le</span>
                <span className="font-semibold">
                  {format(parseISO(planting.expectedHarvestDate), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lot pépinière */}
        {nursery && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Lot pépinière
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Contenants</span>
                <span className="font-semibold">{nursery.containerCount} × {nursery.containerType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Germination</span>
                <span className="font-semibold">{nursery.germinationRate ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Statut</span>
                <StatusBadge status={nursery.status} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tâches associées */}
      <section className="card p-5 mb-5" aria-label="Tâches de cette plantation">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Tâches ({tasks.length})
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune tâche associée</p>
        ) : (
          <ul className="space-y-2" role="list">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className={`text-sm font-medium ${task.status === 'FAIT' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.name}
                  </span>
                  {task.scheduledDate && (
                    <span className="block text-xs text-gray-400">
                      {format(parseISO(task.scheduledDate), 'd MMM', { locale: fr })}
                    </span>
                  )}
                </div>
                <PriorityBadge priority={task.priority} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Récoltes */}
      <section className="card p-5 mb-5" aria-label="Récoltes de cette plantation">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Récoltes — Total : {totalHarvestedKg.toFixed(1)} kg
        </h2>
        {harvests.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune récolte enregistrée</p>
        ) : (
          <ul className="space-y-2" role="list">
            {harvests.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {h.quantityKg} kg
                  </span>
                  <span className="block text-xs text-gray-400">
                    {h.date
                      ? format(parseISO(h.date), 'd MMM yyyy', { locale: fr })
                      : '–'}
                  </span>
                </div>
                <QualityStars quality={h.qualityRating} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Notes */}
      {planting.notes && (
        <section className="card p-5" aria-label="Notes">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Notes
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {planting.notes}
          </p>
        </section>
      )}

      {/* Modal de changement de statut */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Confirmer le changement de statut"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Passer <strong>{planting.cultivar?.name}</strong> au statut{' '}
            <strong>"{STATUS_LABELS_FR[nextStatus]}"</strong> ?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStatusModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              onClick={handleAdvanceStatus}
              disabled={advancingStatus}
              className="btn-primary flex-1"
            >
              {advancingStatus ? 'Mise à jour…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
