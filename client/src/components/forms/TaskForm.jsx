import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSeason } from '../../context/SeasonContext';

const PRIORITIES = [
  { value: 'BASSE', label: 'Basse' },
  { value: 'NORMALE', label: 'Normale' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'URGENTE', label: 'Urgente' },
];

// Suggestions de noms de tâches courantes
const TASK_SUGGESTIONS = [
  'Désherbage',
  'Arrosage',
  'Fertilisation',
  'Repiquage',
  'Récolte',
  'Taille',
  'Traitements',
  'Buttage',
  'Paillage',
  'Semis',
  'Plantation',
  'Observation',
  'Binage',
  'Éclaircissage',
];

export default function TaskForm({ task = null, onSuccess, onCancel }) {
  const { activeSeason } = useSeason();

  const [form, setForm] = useState({
    name: task?.name ?? '',
    description: task?.description ?? '',
    scheduled_date: task?.scheduledDate ? task.scheduledDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
    priority: task?.priority ?? 'NORMALE',
    estimated_duration_min: '',
    // Entité liée (optionnel)
    linked_type: task?.bedId ? 'bed' : task?.plantingId ? 'planting' : '',
    bed_id: task?.bedId ?? '',
    planting_id: task?.plantingId ?? '',
    zone_id: '',
  });

  const [beds, setBeds] = useState([]);
  const [zones, setZones] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nameInput, setNameInput] = useState(task?.name ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = TASK_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(nameInput.toLowerCase()) && nameInput.length > 0
  );

  useEffect(() => {
    const fetchRef = async () => {
      try {
        const [bedsRes, zonesRes, plantingsRes] = await Promise.all([
          api.get('/beds'),
          api.get('/zones'),
          api.get('/plantings', { params: { season_id: activeSeason?.id } }),
        ]);
        setBeds(bedsRes.data || []);
        setZones(zonesRes.data || []);
        setPlantings(plantingsRes.data || []);
      } catch {
        /* Non critique */
      }
    };
    fetchRef();
  }, [activeSeason?.id]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleNameChange = (value) => {
    setNameInput(value);
    handleChange('name', value);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion) => {
    setNameInput(suggestion);
    handleChange('name', suggestion);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        scheduledDate: form.scheduled_date,
        priority: form.priority,
        bedId: form.linked_type === 'bed' && form.bed_id ? form.bed_id : null,
        zoneId: form.linked_type === 'zone' && form.zone_id ? form.zone_id : null,
        plantingId: form.linked_type === 'planting' && form.planting_id ? form.planting_id : null,
      };

      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
        toast.success('Tâche mise à jour');
      } else {
        await api.post('/tasks', payload);
        toast.success('Tâche créée');
      }
      onSuccess?.();
    } catch {
      toast.error("Erreur lors de l'enregistrement de la tâche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulaire de tâche">

      {/* Nom avec autocomplète */}
      <div className="relative">
        <label htmlFor="tf-name" className="form-label">Nom de la tâche *</label>
        <input
          id="tf-name"
          type="text"
          required
          value={nameInput}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => nameInput.length > 0 && setShowSuggestions(true)}
          className="form-input"
          placeholder="ex. Désherbage, Arrosage…"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && filteredSuggestions.length > 0}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto"
            aria-label="Suggestions de noms de tâches"
          >
            {filteredSuggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors"
                  aria-selected={nameInput === s}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="tf-desc" className="form-label">Description</label>
        <textarea
          id="tf-desc"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="form-input"
          rows={3}
          placeholder="Détails supplémentaires…"
        />
      </div>

      {/* Date et priorité */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tf-date" className="form-label">Date prévue *</label>
          <input
            id="tf-date"
            type="date"
            required
            value={form.scheduled_date}
            onChange={(e) => handleChange('scheduled_date', e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="tf-priority" className="form-label">Priorité</label>
          <select
            id="tf-priority"
            value={form.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="form-input"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Durée estimée */}
      <div>
        <label htmlFor="tf-duration" className="form-label">
          Durée estimée (minutes)
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <input
          id="tf-duration"
          type="number"
          min="5"
          step="5"
          value={form.estimated_duration_min}
          onChange={(e) => handleChange('estimated_duration_min', e.target.value)}
          className="form-input"
          placeholder="ex. 30"
        />
      </div>

      {/* Entité liée */}
      <div>
        <label htmlFor="tf-linked-type" className="form-label">
          Lié à
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <select
          id="tf-linked-type"
          value={form.linked_type}
          onChange={(e) => {
            handleChange('linked_type', e.target.value);
            handleChange('bed_id', '');
            handleChange('zone_id', '');
            handleChange('planting_id', '');
          }}
          className="form-input"
        >
          <option value="">Tâche libre (aucun lien)</option>
          <option value="bed">Planche</option>
          <option value="zone">Zone</option>
          <option value="planting">Plantation</option>
        </select>
      </div>

      {/* Sélecteur conditionnel selon le type d'entité lié */}
      {form.linked_type === 'bed' && (
        <div>
          <label htmlFor="tf-bed" className="form-label">Planche</label>
          <select
            id="tf-bed"
            value={form.bed_id}
            onChange={(e) => handleChange('bed_id', e.target.value)}
            className="form-input"
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

      {form.linked_type === 'zone' && (
        <div>
          <label htmlFor="tf-zone" className="form-label">Zone</label>
          <select
            id="tf-zone"
            value={form.zone_id}
            onChange={(e) => handleChange('zone_id', e.target.value)}
            className="form-input"
          >
            <option value="">Choisir une zone…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      )}

      {form.linked_type === 'planting' && (
        <div>
          <label htmlFor="tf-planting" className="form-label">Plantation</label>
          <select
            id="tf-planting"
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
          ) : task ? (
            'Enregistrer'
          ) : (
            'Créer la tâche'
          )}
        </button>
      </div>
    </form>
  );
}
