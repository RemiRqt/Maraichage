import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';

// Sélecteur d'étoiles de qualité
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className="flex gap-1"
      role="radiogroup"
      aria-label="Note de qualité de 1 à 5 étoiles"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            {filled ? (
              <StarSolid className="h-6 w-6 text-yellow-400" aria-hidden="true" />
            ) : (
              <StarIcon className="h-6 w-6 text-gray-300" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function HarvestForm({
  harvest = null, // Null pour création
  seasonId = null,
  defaultPlantingId = null,
  onSuccess,
  onCancel,
}) {
  const [form, setForm] = useState({
    planting_id: harvest?.plantingId ?? defaultPlantingId ?? '',
    date: harvest?.date ? format(new Date(harvest.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    quantity_kg: harvest?.quantityKg ?? '',
    quality: harvest?.qualityRating ?? 3,
    notes: harvest?.notes ?? '',
  });

  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchPlantings = async () => {
      try {
        const res = await api.get('/plantings', {
          params: {
            season_id: seasonId,
            status: 'EN_CROISSANCE,EN_RECOLTE',
          },
        });
        setPlantings(res.data || []);
      } catch {
        /* Non critique */
      } finally {
        setInitialLoading(false);
      }
    };
    fetchPlantings();
  }, [seasonId]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity_kg || Number(form.quantity_kg) <= 0) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        plantingId: form.planting_id,
        date: form.date,
        quantityKg: Number(form.quantity_kg),
        qualityRating: Number(form.quality),
        notes: form.notes,
      };

      if (harvest) {
        await api.put(`/harvests/${harvest.id}`, payload);
        toast.success('Récolte mise à jour');
      } else {
        await api.post('/harvests', payload);
        toast.success('Récolte enregistrée');
      }
      onSuccess?.();
    } catch {
      toast.error("Erreur lors de l'enregistrement de la récolte");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="loading-spinner h-6 w-6" aria-hidden="true" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de saisie de récolte">

      {/* Plantation */}
      {!defaultPlantingId && (
        <div>
          <label htmlFor="hf-planting" className="form-label">Plantation *</label>
          <select
            id="hf-planting"
            required
            value={form.planting_id}
            onChange={(e) => handleChange('planting_id', e.target.value)}
            className="form-input"
          >
            <option value="">Choisir une plantation…</option>
            {plantings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cultivar?.name} — {p.bed?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date (aujourd'hui par défaut) */}
      <div>
        <label htmlFor="hf-date" className="form-label">Date de récolte *</label>
        <input
          id="hf-date"
          type="date"
          required
          value={form.date}
          onChange={(e) => handleChange('date', e.target.value)}
          className="form-input"
        />
      </div>

      {/* Quantité en kg */}
      <div>
        <label htmlFor="hf-qty" className="form-label">Quantité (kg) *</label>
        <input
          id="hf-qty"
          type="number"
          required
          step="0.01"
          min="0.01"
          value={form.quantity_kg}
          onChange={(e) => handleChange('quantity_kg', e.target.value)}
          className="form-input"
          placeholder="ex. 2.5"
          aria-required="true"
        />
      </div>

      {/* Qualité en étoiles */}
      <div>
        <label className="form-label block mb-2">Qualité</label>
        <StarRating
          value={form.quality}
          onChange={(q) => handleChange('quality', q)}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="hf-notes" className="form-label">
          Notes
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <textarea
          id="hf-notes"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="form-input"
          rows={2}
          placeholder="Observations sur cette récolte…"
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
          disabled={loading || !form.planting_id || !form.quantity_kg}
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
          ) : harvest ? (
            'Mettre à jour'
          ) : (
            'Enregistrer la récolte'
          )}
        </button>
      </div>
    </form>
  );
}
