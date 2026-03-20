import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import JournalEntryForm from '../components/forms/JournalEntryForm';

// Pill de tag coloré
function TagPill({ tag }) {
  // Couleur déterministe par hash du tag
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-pink-100 text-pink-700',
    'bg-orange-100 text-orange-700',
  ];
  const idx = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors[idx]}`}>
      <TagIcon className="h-3 w-3" aria-hidden="true" />
      {tag}
    </span>
  );
}

// Carte d'une entrée de journal
function JournalEntryCard({ entry, onEdit, onDelete }) {
  return (
    <article className="card p-5" aria-label={`Entrée du ${format(parseISO(entry.date), 'd MMMM yyyy', { locale: fr })}`}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <time
            dateTime={entry.date}
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {format(parseISO(entry.date), 'EEEE d MMMM yyyy', { locale: fr })}
          </time>
          {entry.user?.name && (
            <p className="text-xs text-gray-400 mt-0.5">par {entry.user.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="btn-ghost p-1.5"
            aria-label="Modifier l'entrée"
          >
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="btn-ghost p-1.5 text-red-500"
            aria-label="Supprimer l'entrée"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Liens vers entités */}
      <div className="flex flex-wrap gap-2 mb-3">
        {entry.bed?.zone?.name && (
          <span className="badge bg-blue-50 text-blue-700 text-xs">🗺️ {entry.bed.zone.name}</span>
        )}
        {entry.bed?.name && (
          <span className="badge bg-green-50 text-green-700 text-xs">📍 {entry.bed.name}</span>
        )}
        {entry.planting?.cultivar?.name && (
          <span className="badge bg-purple-50 text-purple-700 text-xs">🌱 {entry.planting.cultivar.name}</span>
        )}
      </div>

      {/* Contenu textuel */}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {entry.content}
      </p>

      {/* Tags */}
      {(() => {
        const tags = typeof entry.tags === 'string' ? JSON.parse(entry.tags || '[]') : (entry.tags || []);
        return tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        ) : null;
      })()}

      {/* Miniatures de photos */}
      {(() => {
        const photos = typeof entry.photos === 'string' ? JSON.parse(entry.photos || '[]') : (entry.photos || []);
        return photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {photos.map((photo, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={photo.url}
                alt={photo.caption || `Photo ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
              />
            </div>
          ))}
        </div>
        ) : null;
      })()}
    </article>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterBed, setFilterBed] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, bedsRes] = await Promise.all([
        api.get('/journal', {
          params: {
            search: search || undefined,
            date_from: filterDateFrom || undefined,
            date_to: filterDateTo || undefined,
            tag: filterTag || undefined,
            bed_id: filterBed || undefined,
          },
        }),
        api.get('/beds'),
      ]);
      setEntries(entriesRes.data || []);
      setBeds(bedsRes.data || []);
    } catch {
      toast.error('Erreur lors du chargement du journal');
    } finally {
      setLoading(false);
    }
  }, [search, filterDateFrom, filterDateTo, filterTag, filterBed]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/journal/${deleteTarget.id}`);
      toast.success('Entrée supprimée');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Impossible de supprimer cette entrée");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Collecter tous les tags uniques
  const allTags = [...new Set(entries.flatMap((e) => {
    const tags = typeof e.tags === 'string' ? JSON.parse(e.tags || '[]') : (e.tags || []);
    return tags;
  }))].sort();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-6">
        <h1 className="page-title">📸 Journal</h1>
        <button
          onClick={() => { setEditingEntry(null); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Nouvelle entrée
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4 mb-6 space-y-3">
        {/* Recherche */}
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans le contenu…"
            className="form-input pl-9"
            aria-label="Rechercher dans le journal"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="j-date-from" className="form-label">Du</label>
            <input
              id="j-date-from"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="form-input"
              aria-label="Date de début"
            />
          </div>
          <div>
            <label htmlFor="j-date-to" className="form-label">Au</label>
            <input
              id="j-date-to"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="form-input"
              aria-label="Date de fin"
            />
          </div>
          <div>
            <label htmlFor="j-tag" className="form-label">Tag</label>
            <select
              id="j-tag"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="form-input"
              aria-label="Filtrer par tag"
            >
              <option value="">Tous les tags</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="j-bed" className="form-label">Planche</label>
            <select
              id="j-bed"
              value={filterBed}
              onChange={(e) => setFilterBed(e.target.value)}
              className="form-input"
              aria-label="Filtrer par planche"
            >
              <option value="">Toutes planches</option>
              {beds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Fil chronologique */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">📓</p>
          <p>Aucune entrée de journal</p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-ghost mt-3 text-sm"
          >
            + Écrire la première entrée
          </button>
        </div>
      ) : (
        <div className="space-y-4" aria-label="Fil chronologique du journal">
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onEdit={(e) => { setEditingEntry(e); setModalOpen(true); }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Modal entrée */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée de journal'}
        size="lg"
      >
        <JournalEntryForm
          entry={editingEntry}
          onSuccess={() => { setModalOpen(false); fetchData(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'entrée"
        message="Supprimer cette entrée du journal ? Cette action est irréversible."
        confirmLabel="Supprimer"
        isLoading={deleteLoading}
      />
    </div>
  );
}
