import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  PhotoIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function JournalEntryForm({ entry = null, onSuccess, onCancel }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    date: entry?.date ?? format(new Date(), 'yyyy-MM-dd'),
    content: entry?.content ?? '',
    // Type d'entité liée : '' | 'zone' | 'bed' | 'planting'
    linked_type: entry?.linked_type ?? '',
    zone_id: entry?.zone_id ?? '',
    bed_id: entry?.bed_id ?? '',
    planting_id: entry?.planting_id ?? '',
  });

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(entry?.tags ?? []);
  const [photos, setPhotos] = useState([]); // Nouveaux fichiers à uploader
  const [existingPhotos, setExistingPhotos] = useState(entry?.photos ?? []);

  const [zones, setZones] = useState([]);
  const [beds, setBeds] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchRef = async () => {
      try {
        const [zonesRes, bedsRes, plantingsRes] = await Promise.all([
          api.get('/zones'),
          api.get('/beds'),
          api.get('/plantings'),
        ]);
        setZones(zonesRes.data || []);
        setBeds(bedsRes.data || []);
        setPlantings(plantingsRes.data || []);
      } catch {
        /* Non critique */
      } finally {
        setInitialLoading(false);
      }
    };
    fetchRef();
  }, []);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Gestion des tags
  const handleTagInputKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const addTag = (tag) => {
    const normalized = tag.replace(/,/g, '').trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      setTags((prev) => [...prev, normalized]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // Gestion des photos
  const handlePhotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
    // Réinitialiser l'input pour permettre le re-sélect des mêmes fichiers
    e.target.value = '';
  };

  const removeNewPhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingPhoto = async (photoId) => {
    try {
      await api.delete(`/journal/photos/${photoId}`);
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      toast.error('Impossible de supprimer la photo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) {
      toast.error('Le contenu ne peut pas être vide');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('date', form.date);
      payload.append('content', form.content);
      payload.append('tags', JSON.stringify(tags));

      if (form.linked_type === 'zone' && form.zone_id) {
        payload.append('zone_id', form.zone_id);
      }
      if (form.linked_type === 'bed' && form.bed_id) {
        payload.append('bed_id', form.bed_id);
      }
      if (form.linked_type === 'planting' && form.planting_id) {
        payload.append('planting_id', form.planting_id);
      }

      // Ajouter les nouvelles photos
      photos.forEach((file) => {
        payload.append('photos', file);
      });

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (entry) {
        await api.put(`/journal/${entry.id}`, payload, config);
        toast.success('Entrée mise à jour');
      } else {
        await api.post('/journal', payload, config);
        toast.success('Entrée créée');
      }
      onSuccess?.();
    } catch {
      toast.error("Erreur lors de l'enregistrement de l'entrée");
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
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-label="Formulaire d'entrée de journal"
    >
      {/* Date */}
      <div>
        <label htmlFor="je-date" className="form-label">Date *</label>
        <input
          id="je-date"
          type="date"
          required
          value={form.date}
          onChange={(e) => handleChange('date', e.target.value)}
          className="form-input"
        />
      </div>

      {/* Contenu */}
      <div>
        <label htmlFor="je-content" className="form-label">Contenu *</label>
        <textarea
          id="je-content"
          required
          value={form.content}
          onChange={(e) => handleChange('content', e.target.value)}
          className="form-input"
          rows={5}
          placeholder="Décrivez vos observations, actions réalisées, découvertes…"
          aria-required="true"
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="je-tags" className="form-label">
          <TagIcon className="h-4 w-4 inline mr-1" aria-hidden="true" />
          Tags
          <span className="text-gray-400 font-normal ml-1">(Entrée ou virgule pour ajouter)</span>
        </label>

        {/* Saisie de tag */}
        <div className="flex items-center gap-2">
          <input
            id="je-tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            className="form-input flex-1"
            placeholder="Ex. arrosage, ravageur, météo…"
            aria-label="Ajouter un tag"
          />
          <button
            type="button"
            onClick={() => tagInput.trim() && addTag(tagInput)}
            className="btn-secondary text-sm px-3"
            aria-label="Ajouter ce tag"
          >
            Ajouter
          </button>
        </div>

        {/* Affichage des tags */}
        {tags.length > 0 && (
          <div
            className="flex flex-wrap gap-2 mt-2"
            role="list"
            aria-label="Tags ajoutés"
          >
            {tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-green-600 hover:text-green-900 ml-0.5"
                  aria-label={`Supprimer le tag "${tag}"`}
                >
                  <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Entité liée */}
      <div>
        <label htmlFor="je-linked-type" className="form-label">
          Lié à
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <select
          id="je-linked-type"
          value={form.linked_type}
          onChange={(e) => {
            handleChange('linked_type', e.target.value);
            handleChange('zone_id', '');
            handleChange('bed_id', '');
            handleChange('planting_id', '');
          }}
          className="form-input"
        >
          <option value="">Aucune entité</option>
          <option value="zone">Zone</option>
          <option value="bed">Planche</option>
          <option value="planting">Plantation</option>
        </select>
      </div>

      {form.linked_type === 'zone' && (
        <div>
          <label htmlFor="je-zone" className="form-label">Zone</label>
          <select
            id="je-zone"
            value={form.zone_id}
            onChange={(e) => handleChange('zone_id', e.target.value)}
            className="form-input"
          >
            <option value="">Choisir une zone…</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
      )}

      {form.linked_type === 'bed' && (
        <div>
          <label htmlFor="je-bed" className="form-label">Planche</label>
          <select
            id="je-bed"
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

      {form.linked_type === 'planting' && (
        <div>
          <label htmlFor="je-planting" className="form-label">Plantation</label>
          <select
            id="je-planting"
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

      {/* Upload de photos */}
      <div>
        <label className="form-label">
          <PhotoIcon className="h-4 w-4 inline mr-1" aria-hidden="true" />
          Photos
          <span className="text-gray-400 font-normal ml-1">(optionnel, plusieurs possibles)</span>
        </label>

        {/* Photos existantes */}
        {existingPhotos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Photo existante'}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(photo.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Supprimer cette photo"
                >
                  <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Aperçu des nouvelles photos */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Nouvelle photo ${idx + 1}`}
                  className="h-16 w-16 object-cover rounded-lg border border-green-300"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Supprimer la photo ${idx + 1}`}
                >
                  <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary flex items-center gap-2 text-sm"
          aria-label="Ajouter des photos"
        >
          <PhotoIcon className="h-4 w-4" aria-hidden="true" />
          Ajouter des photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotosChange}
          className="sr-only"
          aria-label="Sélectionner des photos"
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
          disabled={loading || !form.content.trim()}
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
          ) : entry ? (
            'Mettre à jour'
          ) : (
            'Publier l\'entrée'
          )}
        </button>
      </div>
    </form>
  );
}
