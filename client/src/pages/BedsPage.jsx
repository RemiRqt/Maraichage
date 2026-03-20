import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ListBulletIcon, MapIcon, PencilIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSpeciesIcon } from '../utils/speciesIcons';

const STATUS_COLORS = {
  PLANIFIE:     { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  SEME:         { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  EN_PEPINIERE: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  TRANSPLANTE:  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  EN_CROISSANCE:{ bg: '#dcfce7', text: '#166534', border: '#86efac' },
  EN_RECOLTE:   { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  TERMINE:      { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  ECHEC:        { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

const STATUS_LABELS = {
  PLANIFIE: 'Planifié', SEME: 'Semé', EN_PEPINIERE: 'Pépinière',
  TRANSPLANTE: 'Transplanté', EN_CROISSANCE: 'Croissance', EN_RECOLTE: 'Récolte',
  TERMINE: 'Terminé', ECHEC: 'Échec',
};

// Planche = une ligne entière, découpée en portions
function BedStrip({ bed, onClick, onEdit }) {
  const plantings = bed.activePlantings || [];
  const isFree = plantings.length === 0;
  const totalArea = parseFloat(bed.areaM2) || 20;

  return (
    <div
      className="w-full flex items-stretch rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
      style={{ minHeight: '56px' }}
      onClick={() => onClick(bed.id)}
      role="button"
      tabIndex={0}
      aria-label={`Planche ${bed.name}${isFree ? ', libre' : ''}`}
    >
      {/* Label planche + bouton édition */}
      <div className="flex flex-col items-center justify-center px-2 sm:px-3 py-2 bg-gray-50 border-r border-gray-200 flex-shrink-0 min-w-[56px] sm:min-w-[80px] group-hover:bg-gray-100 transition-colors relative">
        <span className="text-[10px] sm:text-xs font-bold text-gray-900">{bed.name}</span>
        <span className="text-[8px] sm:text-[10px] text-gray-400">
          {totalArea}m²
        </span>
        <button
          onClick={(e) => onEdit(bed, e)}
          className="absolute top-1 right-1 p-0.5 rounded text-gray-300 hover:text-green-700 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Modifier ${bed.name}`}
          title="Modifier les dimensions"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Bande proportionnelle : plantations + espace libre */}
      <div className="flex-1 flex">
        {plantings.map((p, i) => {
          const area = parseFloat(p.quantityPlanted) || 0;
          const sc = STATUS_COLORS[p.status] || STATUS_COLORS.PLANIFIE;
          const speciesName = p.cultivar?.species?.name;
          const cultivarName = p.cultivar?.name;

          return (
            <div
              key={p.id}
              className="flex flex-col items-center justify-center px-1 sm:px-2 py-1"
              style={{
                flex: area > 0 ? area : totalArea / plantings.length,
                backgroundColor: sc.bg,
                borderRight: '2px solid white',
              }}
              title={`${speciesName} — ${cultivarName} — ${area > 0 ? area + 'm²' : ''} ${STATUS_LABELS[p.status] || p.status}`}
            >
              <span className="text-sm sm:text-base leading-none">{getSpeciesIcon(speciesName)}</span>
              <span className="text-[9px] sm:text-xs font-semibold leading-tight text-center truncate w-full" style={{ color: sc.text }}>
                {cultivarName}
              </span>
              <div className="hidden sm:flex items-center gap-1 mt-0.5">
                {area > 0 && (
                  <span className="text-[10px] opacity-60" style={{ color: sc.text }}>{area}m²</span>
                )}
                <span className="text-[10px] font-medium opacity-70" style={{ color: sc.text }}>
                  {STATUS_LABELS[p.status] || p.status}
                </span>
              </div>
            </div>
          );
        })}

        {/* Espace libre restant */}
        {(() => {
          const usedArea = plantings.reduce((s, p) => s + (parseFloat(p.quantityPlanted) || 0), 0);
          const freeArea = totalArea - usedArea;
          if (freeArea <= 0) return null;
          return (
            <div
              className="flex items-center justify-center relative overflow-hidden"
              style={{ flex: freeArea, backgroundColor: '#2d4a1e' }}
            >
              <div className="absolute inset-0 opacity-15">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-b border-green-500" style={{ height: '16.6%' }} />
                ))}
              </div>
              <span className="text-[10px] font-medium text-green-400 z-10">{freeArea}m² libre</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function BedsPage() {
  const { activeSeason } = useSeason();
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [bedsByZone, setBedsByZone] = useState({});
  const [activeZoneId, setActiveZoneId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal édition planche individuelle
  const [editBed, setEditBed] = useState(null);
  const [editForm, setEditForm] = useState({ lengthM: '', widthM: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Modal édition dimensions de toute la zone
  const [zoneEditOpen, setZoneEditOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ lengthM: '', widthM: '' });
  const [zoneSaving, setZoneSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeSeason?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const zonesRes = await api.get('/zones');
      const fetchedZones = zonesRes.data || [];
      setZones(fetchedZones);

      if (fetchedZones.length > 0 && !activeZoneId) {
        setActiveZoneId(fetchedZones[0].id);
      }

      const bedsResults = await Promise.allSettled(
        fetchedZones.map((zone) =>
          api.get('/beds', { params: { zone_id: zone.id, season_id: activeSeason.id } })
        )
      );

      const bedsMap = {};
      fetchedZones.forEach((zone, idx) => {
        bedsMap[zone.id] = bedsResults[idx].status === 'fulfilled'
          ? bedsResults[idx].value.data || []
          : [];
      });
      setBedsByZone(bedsMap);
    } catch {
      toast.error('Erreur lors du chargement des parcelles');
    } finally {
      setLoading(false);
    }
  }, [activeSeason?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentBeds = bedsByZone[activeZoneId] || [];
  const occupiedCount = currentBeds.filter((b) => (b.activePlantings?.length || 0) > 0).length;
  const totalPlantings = currentBeds.reduce((s, b) => s + (b.activePlantings?.length || 0), 0);
  const activeZone = zones.find((z) => z.id === activeZoneId);

  // Ouvrir l'édition d'une planche
  const openEditBed = (bed, e) => {
    e.stopPropagation();
    setEditBed(bed);
    setEditForm({
      lengthM: bed.lengthM ?? '',
      widthM: bed.widthM ?? '',
      notes: bed.notes ?? '',
    });
  };

  const handleEditBed = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/beds/${editBed.id}`, {
        lengthM: editForm.lengthM ? parseFloat(editForm.lengthM) : undefined,
        widthM: editForm.widthM ? parseFloat(editForm.widthM) : undefined,
        notes: editForm.notes || undefined,
      });
      toast.success(`${editBed.name} mis à jour`);
      setEditBed(null);
      fetchData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setEditSaving(false);
    }
  };

  // Modifier toutes les planches de la zone
  const openZoneEdit = () => {
    setZoneForm({ lengthM: '', widthM: '' });
    setZoneEditOpen(true);
  };

  const handleZoneEdit = async (e) => {
    e.preventDefault();
    if (!zoneForm.lengthM && !zoneForm.widthM) {
      toast.error('Renseignez au moins une dimension');
      return;
    }
    setZoneSaving(true);
    try {
      const updates = currentBeds.map((bed) =>
        api.put(`/beds/${bed.id}`, {
          lengthM: zoneForm.lengthM ? parseFloat(zoneForm.lengthM) : undefined,
          widthM: zoneForm.widthM ? parseFloat(zoneForm.widthM) : undefined,
        })
      );
      await Promise.all(updates);
      toast.success(`${currentBeds.length} planches mises à jour`);
      setZoneEditOpen(false);
      fetchData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setZoneSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">🗺️ Parcelles</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Onglets de zones */}
          {zones.length > 0 && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3 sm:mb-5 w-full sm:w-fit overflow-x-auto" role="tablist">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  role="tab"
                  aria-selected={activeZoneId === zone.id}
                  onClick={() => setActiveZoneId(zone.id)}
                  className={[
                    'px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                    activeZoneId === zone.id ? 'bg-white text-[#1B5E20] shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          )}

          {/* Résumé + actions zone */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{occupiedCount}/{currentBeds.length}</span> planches occupées
                {totalPlantings > occupiedCount && (
                  <span className="ml-2 text-gray-400">· {totalPlantings} plantations</span>
                )}
              </p>
              <button
                onClick={openZoneEdit}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-700 border border-gray-300 rounded-lg px-2 py-1 hover:border-green-400 transition-colors"
                title={`Modifier les dimensions de toutes les planches de ${activeZone?.name}`}
              >
                <Cog6ToothIcon className="h-3.5 w-3.5" />
                Dimensions {activeZone?.name}
              </button>
            </div>
            <div className="hidden sm:flex flex-wrap gap-1.5 text-[10px]">
              {Object.entries(STATUS_COLORS).map(([status, c]) => (
                <span key={status} className="px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
                  {STATUS_LABELS[status] || status}
                </span>
              ))}
              <span className="px-1.5 py-0.5 rounded font-medium bg-[#2d4a1e] text-green-400">Libre</span>
            </div>
          </div>

          {/* Planches en bandes */}
          {currentBeds.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucune planche dans cette zone</p>
          ) : (
            <div className="space-y-2">
              {currentBeds.map((bed) => (
                <BedStrip key={bed.id} bed={bed} onClick={(id) => navigate(`/parcelles/${id}`)} onEdit={openEditBed} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal édition planche individuelle */}
      <Modal isOpen={!!editBed} onClose={() => setEditBed(null)} title={`Modifier ${editBed?.name}`}>
        <form onSubmit={handleEditBed} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bed-length" className="form-label">Longueur (m)</label>
              <input
                id="bed-length"
                type="number"
                step="0.1"
                min="0.1"
                value={editForm.lengthM}
                onChange={(e) => setEditForm((f) => ({ ...f, lengthM: e.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="bed-width" className="form-label">Largeur (m)</label>
              <input
                id="bed-width"
                type="number"
                step="0.1"
                min="0.1"
                value={editForm.widthM}
                onChange={(e) => setEditForm((f) => ({ ...f, widthM: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          {editForm.lengthM && editForm.widthM && (
            <p className="text-sm text-gray-500">
              Surface : <span className="font-semibold">{(parseFloat(editForm.lengthM) * parseFloat(editForm.widthM)).toFixed(1)} m²</span>
            </p>
          )}
          <div>
            <label htmlFor="bed-notes" className="form-label">Notes</label>
            <textarea
              id="bed-notes"
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              className="form-input"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditBed(null)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={editSaving} className="btn-primary flex-1">
              {editSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal dimensions de la zone */}
      <Modal isOpen={zoneEditOpen} onClose={() => setZoneEditOpen(false)} title={`Dimensions — ${activeZone?.name} (${currentBeds.length} planches)`}>
        <form onSubmit={handleZoneEdit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Appliquer les mêmes dimensions à toutes les planches de <strong>{activeZone?.name}</strong>.
            Laissez vide pour ne pas modifier.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="zone-length" className="form-label">Longueur (m)</label>
              <input
                id="zone-length"
                type="number"
                step="0.1"
                min="0.1"
                value={zoneForm.lengthM}
                onChange={(e) => setZoneForm((f) => ({ ...f, lengthM: e.target.value }))}
                className="form-input"
                placeholder="ex: 30"
              />
            </div>
            <div>
              <label htmlFor="zone-width" className="form-label">Largeur (m)</label>
              <input
                id="zone-width"
                type="number"
                step="0.1"
                min="0.1"
                value={zoneForm.widthM}
                onChange={(e) => setZoneForm((f) => ({ ...f, widthM: e.target.value }))}
                className="form-input"
                placeholder="ex: 0.75"
              />
            </div>
          </div>
          {zoneForm.lengthM && zoneForm.widthM && (
            <p className="text-sm text-gray-500">
              Surface par planche : <span className="font-semibold">{(parseFloat(zoneForm.lengthM) * parseFloat(zoneForm.widthM)).toFixed(1)} m²</span>
              {' '}· Total zone : <span className="font-semibold">{(parseFloat(zoneForm.lengthM) * parseFloat(zoneForm.widthM) * currentBeds.length).toFixed(0)} m²</span>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setZoneEditOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={zoneSaving} className="btn-primary flex-1">
              {zoneSaving ? 'Mise à jour…' : `Appliquer à ${currentBeds.length} planches`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
