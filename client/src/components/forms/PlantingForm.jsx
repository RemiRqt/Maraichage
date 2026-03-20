import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useSeason } from '../../context/SeasonContext';

export default function PlantingForm({
  planting = null, // Null pour création, objet pour édition
  defaultBedId = null,
  onSuccess,
  onCancel,
}) {
  const { activeSeason } = useSeason();

  const [form, setForm] = useState({
    bed_id: defaultBedId ?? planting?.bedId ?? '',
    cultivar_id: planting?.cultivarId ?? '',
    culture_sheet_id: planting?.cultureSheetId ?? '',
    sowing_date: planting?.sowingDate ? planting.sowingDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
    quantity: planting?.quantityPlanted ?? '',
    notes: planting?.notes ?? '',
  });

  const [beds, setBeds] = useState([]);
  const [cultivars, setCultivars] = useState([]);
  const [cultureSheets, setCultureSheets] = useState([]);
  const [rotationWarning, setRotationWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les données de référence
  useEffect(() => {
    const fetchRef = async () => {
      try {
        const [bedsRes, cultivarsRes] = await Promise.all([
          api.get('/beds'),
          api.get('/cultivars'),
        ]);
        setBeds(bedsRes.data || []);
        setCultivars(cultivarsRes.data || []);
      } catch {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchRef();
  }, []);

  // Charger la fiche technique de l'espèce quand le cultivar change
  useEffect(() => {
    if (!form.cultivar_id) {
      setCultureSheets([]);
      setForm((f) => ({ ...f, culture_sheet_id: '' }));
      return;
    }

    const fetchSheets = async () => {
      try {
        // Trouver l'espèce du cultivar sélectionné
        const cv = cultivars.find((c) => c.id === form.cultivar_id);
        const speciesId = cv?.speciesId || cv?.species_id || cv?.species?.id;
        if (!speciesId) return;

        const res = await api.get('/culture-sheets', {
          params: { species_id: speciesId },
        });
        const sheets = res.data || [];
        setCultureSheets(sheets);
        // Auto-remplissage si une seule fiche disponible
        if (sheets.length === 1 && !form.culture_sheet_id) {
          setForm((f) => ({ ...f, culture_sheet_id: sheets[0].id }));
        }
      } catch {
        /* Pas critique */
      }
    };
    fetchSheets();
  }, [form.cultivar_id, cultivars]);

  // Vérifier la rotation quand la planche ou le cultivar change
  useEffect(() => {
    if (!form.bed_id || !form.cultivar_id) {
      setRotationWarning(null);
      return;
    }

    const checkRotation = async () => {
      try {
        const res = await api.get('/plantings/rotation-check', {
          params: {
            bed_id: form.bed_id,
            cultivar_id: form.cultivar_id,
            season_id: activeSeason?.id,
          },
        });
        setRotationWarning(res.data?.warning || null);
      } catch {
        setRotationWarning(null);
      }
    };
    checkRotation();
  }, [form.bed_id, form.cultivar_id, activeSeason?.id]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        seasonId: activeSeason?.id,
        bedId: form.bed_id,
        cultivarId: form.cultivar_id,
        cultureSheetId: form.culture_sheet_id || null,
        sowingDate: form.sowing_date,
        quantityPlanted: form.quantity ? Number(form.quantity) : null,
        notes: form.notes,
      };

      if (planting) {
        await api.put(`/plantings/${planting.id}`, payload);
      } else {
        await api.post('/plantings', payload);
      }
      onSuccess?.();
    } catch {
      toast.error("Erreur lors de l'enregistrement de la plantation");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="loading-spinner h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de plantation">
      {/* Planche */}
      {!defaultBedId && (
        <div>
          <label htmlFor="pf-bed" className="form-label">Planche *</label>
          <select
            id="pf-bed"
            required
            value={form.bed_id}
            onChange={(e) => handleChange('bed_id', e.target.value)}
            className="form-input"
            aria-required="true"
          >
            <option value="">Choisir une planche…</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.zone?.name ? ` — ${b.zone.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cultivar avec recherche */}
      <div>
        <label htmlFor="pf-cultivar" className="form-label">Cultivar *</label>
        <select
          id="pf-cultivar"
          required
          value={form.cultivar_id}
          onChange={(e) => handleChange('cultivar_id', e.target.value)}
          className="form-input"
          aria-required="true"
        >
          <option value="">Choisir un cultivar…</option>
          {cultivars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.species?.name ? ` (${c.species.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Avertissement de rotation */}
      {rotationWarning && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm"
          role="alert"
        >
          <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Avertissement de rotation</p>
            <p>{rotationWarning}</p>
          </div>
        </div>
      )}

      {/* Fiche technique (optionnelle, auto-remplie) */}
      <div>
        <label htmlFor="pf-sheet" className="form-label">
          Fiche technique
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <select
          id="pf-sheet"
          value={form.culture_sheet_id}
          onChange={(e) => handleChange('culture_sheet_id', e.target.value)}
          className="form-input"
          disabled={cultureSheets.length === 0}
        >
          <option value="">
            {cultureSheets.length === 0
              ? 'Aucune fiche disponible'
              : 'Sans fiche technique'}
          </option>
          {cultureSheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.species?.name} — {s.transplantChart?.daysToMaturity || s.directSowChart?.daysToMaturity || '?'}j maturité{s.sowingMethod ? ` (${s.sowingMethod})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Date de semis */}
      <div>
        <label htmlFor="pf-date" className="form-label">Date de semis *</label>
        <input
          id="pf-date"
          type="date"
          required
          value={form.sowing_date}
          onChange={(e) => handleChange('sowing_date', e.target.value)}
          className="form-input"
          aria-required="true"
        />
      </div>

      {/* Quantité */}
      <div>
        <label htmlFor="pf-qty" className="form-label">
          Quantité de plants / graines
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <input
          id="pf-qty"
          type="number"
          min="1"
          step="1"
          value={form.quantity}
          onChange={(e) => handleChange('quantity', e.target.value)}
          className="form-input"
          placeholder="ex. 36"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="pf-notes" className="form-label">Notes</label>
        <textarea
          id="pf-notes"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="form-input"
          rows={3}
          placeholder="Observations, variété spécifique…"
        />
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary flex-1"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Enregistrement…
            </>
          ) : planting ? (
            'Enregistrer'
          ) : (
            'Créer la plantation'
          )}
        </button>
      </div>
    </form>
  );
}
