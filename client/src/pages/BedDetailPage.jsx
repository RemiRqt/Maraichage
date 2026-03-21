import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PlantingForm from '../components/forms/PlantingForm';

export default function BedDetailPage() {
  const { bedId } = useParams();
  const navigate = useNavigate();
  const { activeSeason } = useSeason();

  const [bed, setBed] = useState(null);
  const [plantings, setPlantings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/beds/${bedId}`);
      const data = res.data;
      setBed(data);

      const plantingHistory = data.plantingHistory || [];
      setHistory(plantingHistory);

      // Plantations de la saison active
      const currentSeasonHistory = plantingHistory.find(
        (h) => h.season?.id === activeSeason?.id
      );
      setPlantings(currentSeasonHistory?.plantings || []);
    } catch {
      toast.error('Erreur lors du chargement de la planche');
    } finally {
      setLoading(false);
    }
  }, [bedId, activeSeason?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlantingCreated = () => {
    setModalOpen(false);
    fetchData();
    toast.success('Plantation créée avec succès');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!bed) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Planche introuvable</p>
        <button onClick={() => navigate('/parcelles')} className="btn-ghost mt-4">
          Retour aux parcelles
        </button>
      </div>
    );
  }

  const surface = bed.lengthM && bed.widthM
    ? (bed.lengthM * bed.widthM).toFixed(1)
    : bed.areaM2 || null;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      {/* En-tête de navigation */}
      <button
        onClick={() => navigate('/parcelles')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        aria-label="Retour aux parcelles"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Retour aux parcelles
      </button>

      {/* Titre et informations de la planche */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-lg sm:text-xl">{bed.name}</h1>
            {bed.zone?.name && (
              <span className="badge bg-blue-100 text-blue-700">{bed.zone.name}</span>
            )}
          </div>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            {bed.lengthM && <span>Longueur : {bed.lengthM} m</span>}
            {bed.widthM && <span>Largeur : {bed.widthM} m</span>}
            {surface && <span>Surface : {surface} m²</span>}
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
          aria-label="Ajouter une plantation"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Ajouter une plantation
        </button>
      </div>

      {/* Chronologie de la saison en cours */}
      <section className="mb-6" aria-label={`Plantations saison ${activeSeason?.name}`}>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Saison en cours — {activeSeason?.name}
        </h2>

        {plantings.length === 0 ? (
          <div className="card p-6 text-center text-gray-400">
            <p className="text-3xl mb-2" aria-hidden="true">🌱</p>
            <p>Aucune plantation cette saison</p>
            <button onClick={() => setModalOpen(true)} className="btn-ghost mt-3 text-sm">
              + Ajouter la première plantation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[...plantings]
              .sort((a, b) => new Date(a.sowingDate) - new Date(b.sowingDate))
              .map((planting) => (
                <div
                  key={planting.id}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/plantings/${planting.id}`)}
                  role="button"
                  aria-label={`Voir la plantation de ${planting.cultivar?.name}`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/plantings/${planting.id}`)}
                >
                  <div>
                    <span className="font-semibold text-gray-900">{planting.cultivar?.name}</span>
                    {planting.sowingDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Semé le{' '}
                        {format(parseISO(planting.sowingDate), 'd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={planting.status} />
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Historique par saison */}
      {history.length > 0 && (
        <section className="mb-6" aria-label="Historique par saison">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Historique des saisons
          </h2>
          <div className="space-y-2">
            {history.map((seasonHistory) => (
              <div key={seasonHistory.season?.id} className="card overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedSeason(
                      expandedSeason === seasonHistory.season?.id
                        ? null
                        : seasonHistory.season?.id
                    )
                  }
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  aria-expanded={expandedSeason === seasonHistory.season?.id}
                >
                  <span className="font-medium text-gray-700">{seasonHistory.season?.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {seasonHistory.plantings?.length || 0} plantation(s)
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedSeason === seasonHistory.season?.id ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {expandedSeason === seasonHistory.season?.id && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    {seasonHistory.plantings?.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0"
                      >
                        <span className="text-gray-700">{p.cultivar?.name}</span>
                        <div className="flex items-center gap-2">
                          {p.sowingDate && (
                            <span className="text-gray-400 text-xs">
                              {format(parseISO(p.sowingDate), 'd MMM yyyy', { locale: fr })}
                            </span>
                          )}
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}


      {/* Modal d'ajout de plantation */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter une plantation"
        size="lg"
      >
        <PlantingForm
          defaultBedId={bedId}
          onSuccess={handlePlantingCreated}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
