import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useSeason } from '../../context/SeasonContext';

const CONTAINER_TYPES = [
  { value: 'ALVEOLES_40', label: 'Alvéoles 40', cells: 40 },
  { value: 'ALVEOLES_60', label: 'Alvéoles 60', cells: 60 },
  { value: 'ALVEOLES_80', label: 'Alvéoles 80', cells: 80 },
  { value: 'ALVEOLES_104', label: 'Alvéoles 104', cells: 104 },
  { value: 'POT_7CM', label: 'Pot 7 cm', cells: 1 },
  { value: 'POT_10CM', label: 'Pot 10 cm', cells: 1 },
  { value: 'CAISSETTE', label: 'Caissette', cells: 0 },
  { value: 'GODET', label: 'Godet', cells: 1 },
  { value: 'AUTRE', label: 'Autre', cells: 0 },
];

export default function NurseryBatchForm({ batch = null, defaultCultivarId = '', defaultPlantingId = '', onSuccess, onCancel }) {
  const { activeSeason } = useSeason();

  const [form, setForm] = useState({
    planting_id: batch?.plantingId ?? defaultPlantingId,
    sowing_date: batch?.sowingDate ? batch.sowingDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
    container_type: batch?.containerType ?? 'ALVEOLES_60',
    container_count: batch?.containerCount ?? '',
    cells_per_container: batch?.cellsPerContainer ?? 60,
    notes: batch?.notes ?? '',
  });

  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [selectedCultivarId, setSelectedCultivarId] = useState(batch?.cultivarId ?? defaultCultivarId);
  const [selectedSeedId, setSelectedSeedId] = useState(batch?.seedInventoryId ?? '');

  const [species, setSpecies] = useState([]);
  const [cultivarsWithSeeds, setCultivarsWithSeeds] = useState([]); // cultivars qui ont du stock
  const [seeds, setSeeds] = useState([]); // lots de graines du cultivar sélectionné
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Chargement initial : espèces + plantations + stock de graines
  useEffect(() => {
    const load = async () => {
      try {
        const [speciesRes, plantingsRes, seedsRes] = await Promise.all([
          api.get('/species'),
          api.get('/plantings', { params: { season_id: activeSeason?.id } }),
          api.get('/seeds'),
        ]);
        setSpecies(speciesRes.data || []);
        setPlantings(plantingsRes.data || []);

        // Grouper les graines par cultivar pour savoir qui a du stock
        const allSeeds = seedsRes.data || [];
        const withStock = allSeeds.filter((s) => s.quantity > 0);
        // Dédoublonner par cultivar_id
        const seen = new Set();
        const unique = withStock.filter((s) => {
          if (seen.has(s.cultivar_id)) return false;
          seen.add(s.cultivar_id);
          return true;
        });
        setCultivarsWithSeeds(unique);
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [activeSeason?.id]);

  // Charger les lots de graines + la fiche technique du cultivar sélectionné
  useEffect(() => {
    if (!selectedCultivarId) { setSeeds([]); setSelectedSeedId(''); return; }
    api.get('/seeds', { params: { cultivar_id: selectedCultivarId } })
      .then((r) => {
        const avail = (r.data || []).filter((s) => s.quantity > 0);
        setSeeds(avail);
        if (avail.length === 1) setSelectedSeedId(avail[0].id);
        else setSelectedSeedId('');
      })
      .catch(() => setSeeds([]));

    // Charger la fiche technique pour pré-remplir le contenant
    api.get('/culture-sheets', { params: { species_id: '' } })
      .then((r) => {
        const sheets = r.data || [];
        const sheet = sheets.find((s) => {
          // Trouver la fiche dont l'espèce correspond au cultivar
          const cultivar = cultivarsWithSeeds.find((c) => c.cultivar_id === selectedCultivarId);
          return cultivar && s.species?.name === cultivar.species_name;
        });
        if (sheet?.nurseryChart) {
          const nc = sheet.nurseryChart;
          // Mapper le containerType de la fiche vers les valeurs du select
          const containerType = nc.containerType || '';
          const match = CONTAINER_TYPES.find((ct) =>
            containerType.toLowerCase().includes(ct.label.toLowerCase().split(' ')[0])
          );
          if (match && !batch) {
            setForm((f) => ({
              ...f,
              container_type: match.value,
              cells_per_container: match.cells || nc.seedsPerCell || f.cells_per_container,
            }));
          }
        }
      })
      .catch(() => {});
  }, [selectedCultivarId]);

  // Cultivars filtrés par espèce sélectionnée parmi ceux qui ont du stock
  const filteredCultivars = useMemo(() => {
    if (!selectedSpeciesId) return cultivarsWithSeeds;
    return cultivarsWithSeeds.filter((s) => {
      // On n'a pas species_id directement — on filtre via species_name en comparant à l'espèce choisie
      const sp = species.find((sp) => sp.id === selectedSpeciesId);
      return sp && s.species_name === sp.name;
    });
  }, [selectedSpeciesId, cultivarsWithSeeds, species]);

  const selectedSeed = seeds.find((s) => s.id === selectedSeedId);
  const totalSeedsSown = (Number(form.container_count) || 0) * (Number(form.cells_per_container) || 0);
  const stockInsuffisant = selectedSeed && totalSeedsSown > selectedSeed.quantity;

  const handleContainerTypeChange = (type) => {
    const ct = CONTAINER_TYPES.find((c) => c.value === type);
    setForm((f) => ({ ...f, container_type: type, cells_per_container: ct?.cells ?? 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCultivarId) return toast.error('Choisissez un cultivar');
    if (stockInsuffisant) return toast.error('Stock de graines insuffisant');

    setLoading(true);
    try {
      const payload = {
        plantingId: form.planting_id || null,
        cultivarId: selectedCultivarId,
        seedInventoryId: selectedSeedId || null,
        sowingDate: form.sowing_date,
        containerType: form.container_type,
        containerCount: Number(form.container_count),
        cellsPerContainer: Number(form.cells_per_container),
        totalSeedsSown,
        notes: form.notes,
      };

      if (batch) {
        await api.put(`/nursery/${batch.id}`, payload);
      } else {
        await api.post('/nursery', payload);
      }
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || "Erreur lors de l'enregistrement du lot";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center py-6"><div className="loading-spinner h-6 w-6" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Sélection espèce */}
      <div>
        <label className="form-label">Espèce</label>
        <select
          className="form-input"
          value={selectedSpeciesId}
          onChange={(e) => { setSelectedSpeciesId(e.target.value); setSelectedCultivarId(''); }}
        >
          <option value="">— Toutes les espèces —</option>
          {species.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
      </div>

      {/* Cultivar — seulement ceux avec stock */}
      <div>
        <label className="form-label">
          Cultivar *
          <span className="ml-1 text-xs text-gray-400 font-normal">(avec graines en stock)</span>
        </label>
        {filteredCultivars.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            Aucun cultivar avec stock{selectedSpeciesId ? ' pour cette espèce' : ''}. Importez une facture fournisseur.
          </div>
        ) : (
          <select
            className="form-input"
            required
            value={selectedCultivarId}
            onChange={(e) => setSelectedCultivarId(e.target.value)}
          >
            <option value="">— Choisir un cultivar —</option>
            {filteredCultivars.map((s) => (
              <option key={s.cultivar_id} value={s.cultivar_id}>
                {s.cultivar_name} · {s.quantity} graines dispo
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lot de graines */}
      {selectedCultivarId && (
        <div>
          <label className="form-label">Lot de graines utilisé</label>
          {seeds.length === 0 ? (
            <p className="text-sm text-red-600">Aucun stock disponible pour ce cultivar.</p>
          ) : (
            <select
              className="form-input"
              value={selectedSeedId}
              onChange={(e) => setSelectedSeedId(e.target.value)}
            >
              <option value="">— Sans déduction de stock —</option>
              {seeds.map((s) => {
                return (
                  <option key={s.id} value={s.id}>
                    {s.supplier || 'Inconnu'} · {s.quantity} graines · {s.lot_number || 'sans lot'}
                    {s.expiry_date ? ` · exp. ${s.expiry_date.slice(0,7)}` : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      )}

      {/* Plantation liée (optionnel) */}
      <div>
        <label className="form-label">
          Plantation associée
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <select
          value={form.planting_id}
          onChange={(e) => setForm((f) => ({ ...f, planting_id: e.target.value }))}
          className="form-input"
        >
          <option value="">Sans plantation associée</option>
          {plantings.map((p) => (
            <option key={p.id} value={p.id}>{p.cultivar?.name} — {p.bed?.name}</option>
          ))}
        </select>
      </div>

      {/* Date de semis */}
      <div>
        <label className="form-label">Date de semis *</label>
        <input
          type="date"
          required
          value={form.sowing_date}
          onChange={(e) => setForm((f) => ({ ...f, sowing_date: e.target.value }))}
          className="form-input"
        />
      </div>

      {/* Contenant */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="form-label">Type de contenant *</label>
          <select
            required
            value={form.container_type}
            onChange={(e) => handleContainerTypeChange(e.target.value)}
            className="form-input"
          >
            {CONTAINER_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Nombre *</label>
          <input
            type="number" required min="1" step="1"
            value={form.container_count}
            onChange={(e) => setForm((f) => ({ ...f, container_count: e.target.value }))}
            className="form-input"
            placeholder="ex. 3"
          />
        </div>
        <div>
          <label className="form-label">Cellules / contenant</label>
          <input
            type="number" min="0" step="1"
            value={form.cells_per_container}
            onChange={(e) => setForm((f) => ({ ...f, cells_per_container: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>

      {/* Total plants + avertissement stock */}
      {totalSeedsSown > 0 && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          stockInsuffisant
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {stockInsuffisant && <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />}
          <span>
            Total : <strong>{totalSeedsSown} graines</strong>
            {selectedSeed && (
              <>
                {' '}· Stock disponible : <strong>{selectedSeed.quantity} graines</strong>
                {stockInsuffisant && ' — insuffisant !'}
              </>
            )}
          </span>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="form-label">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="form-input" rows={2}
          placeholder="Observations, substrat utilisé…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary flex-1">
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || !form.container_count || !selectedCultivarId || stockInsuffisant}
          className="btn-primary flex-1"
        >
          {loading ? 'Enregistrement…' : batch ? 'Enregistrer' : 'Créer le lot'}
        </button>
      </div>
    </form>
  );
}
