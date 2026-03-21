import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSpeciesIcon } from '../utils/speciesIcons';

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'LEGUME', label: 'Légume' },
  { value: 'AROMATIQUE', label: 'Aromatique' },
  { value: 'FRUIT', label: 'Fruit' },
  { value: 'FLEUR', label: 'Fleur' },
];

const CATEGORY_COLORS = {
  LEGUME: 'bg-green-100 text-green-700',
  AROMATIQUE: 'bg-purple-100 text-purple-700',
  FRUIT: 'bg-orange-100 text-orange-700',
  FLEUR: 'bg-pink-100 text-pink-700',
};

export default function CulturesPage() {
  const { activeSeason } = useSeason();

  const [species, setSpecies] = useState([]);
  const [cultivars, setCultivars] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);

  // Expansion
  const [expandedId, setExpandedId] = useState(null);

  // Modals espèce
  const [speciesModalOpen, setSpeciesModalOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState(null);
  const [speciesForm, setSpeciesForm] = useState({ name: '', family: '', category: 'LEGUME', notes: '' });

  // Modals cultivar
  const [cultivarModalOpen, setCultivarModalOpen] = useState(false);
  const [editingCultivar, setEditingCultivar] = useState(null);
  const [cultivarForm, setCultivarForm] = useState({ name: '', speciesId: '', description: '' });

  // Suppression
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'species' | 'cultivar'
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [speciesRes, cultivarsRes, plantingsRes] = await Promise.all([
        api.get('/species', { params: { search: search || undefined, category: category || undefined } }),
        api.get('/cultivars'),
        activeSeason?.id ? api.get('/plantings', { params: { season_id: activeSeason.id } }) : Promise.resolve({ data: [] }),
      ]);
      setSpecies(speciesRes.data || []);
      setCultivars(cultivarsRes.data || []);
      setPlantings(plantingsRes.data || []);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [search, category, activeSeason?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Espèces et cultivars en culture
  const activeSpeciesIds = useMemo(() => {
    const ids = new Set();
    plantings.forEach((p) => {
      const sid = p.cultivar?.species?.id || p.cultivar?.speciesId;
      if (sid) ids.add(sid);
    });
    return ids;
  }, [plantings]);

  const activeCultivarIds = useMemo(() => {
    const ids = new Set();
    plantings.forEach((p) => {
      const cid = p.cultivarId || p.cultivar?.id;
      if (cid) ids.add(cid);
    });
    return ids;
  }, [plantings]);

  // Cultivars groupés par espèce
  const cultivarsBySpecies = useMemo(() => {
    const map = {};
    cultivars.forEach((cv) => {
      const sid = cv.speciesId || cv.species?.id;
      if (!map[sid]) map[sid] = [];
      map[sid].push(cv);
    });
    return map;
  }, [cultivars]);

  // Filtrage espèces
  const filteredSpecies = useMemo(() => {
    let list = species;
    if (onlyActive) list = list.filter((sp) => activeSpeciesIds.has(sp.id));
    return list;
  }, [species, onlyActive, activeSpeciesIds]);

  // Plantings par cultivar pour affichage
  const plantingsByCultivar = useMemo(() => {
    const map = {};
    plantings.forEach((p) => {
      const cid = p.cultivarId || p.cultivar?.id;
      if (!cid) return;
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    });
    return map;
  }, [plantings]);

  // --- Handlers espèce ---
  const openCreateSpecies = () => {
    setEditingSpecies(null);
    setSpeciesForm({ name: '', family: '', category: 'LEGUME', notes: '' });
    setSpeciesModalOpen(true);
  };

  const openEditSpecies = (sp, e) => {
    e.stopPropagation();
    setEditingSpecies(sp);
    setSpeciesForm({ name: sp.name, family: sp.family || '', category: sp.category, notes: sp.notes || '' });
    setSpeciesModalOpen(true);
  };

  const handleSpeciesSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSpecies) {
        await api.put(`/species/${editingSpecies.id}`, speciesForm);
        toast.success('Espèce mise à jour');
      } else {
        await api.post('/species', speciesForm);
        toast.success('Espèce créée');
      }
      setSpeciesModalOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  // --- Handlers cultivar ---
  const openCreateCultivar = (speciesId, e) => {
    e.stopPropagation();
    setEditingCultivar(null);
    setCultivarForm({ name: '', speciesId, description: '' });
    setCultivarModalOpen(true);
  };

  const openEditCultivar = (cv) => {
    setEditingCultivar(cv);
    setCultivarForm({ name: cv.name, speciesId: cv.speciesId, description: cv.description || '' });
    setCultivarModalOpen(true);
  };

  const handleCultivarSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCultivar) {
        await api.put(`/cultivars/${editingCultivar.id}`, cultivarForm);
        toast.success('Cultivar mis à jour');
      } else {
        await api.post('/cultivars', cultivarForm);
        toast.success('Cultivar créé');
      }
      setCultivarModalOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  // --- Suppression ---
  const confirmDelete = (item, type, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(item);
    setDeleteType(type);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/${deleteType === 'species' ? 'species' : 'cultivars'}/${deleteTarget.id}`);
      toast.success(deleteType === 'species' ? 'Espèce supprimée' : 'Cultivar supprimé');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Impossible de supprimer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">🌱 Cultures</h1>
        <button onClick={openCreateSpecies} className="btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">
          <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="sr-only">Nouvelle espèce</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-3 sm:mb-5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="form-input pl-8 text-sm py-1.5 sm:py-2"
            aria-label="Rechercher"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="form-input w-auto text-sm py-1.5 sm:py-2"
          aria-label="Catégorie"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          onClick={() => setOnlyActive(!onlyActive)}
          className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
            onlyActive
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
          aria-pressed={onlyActive}
        >
          <span className="hidden sm:inline">En culture</span> ({activeSpeciesIds.size})
        </button>
      </div>

      {/* Liste espèces */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : filteredSpecies.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🌱</p>
          <p>Aucune espèce trouvée</p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {filteredSpecies.map((sp) => {
            const isActive = activeSpeciesIds.has(sp.id);
            const isExpanded = expandedId === sp.id;
            const cvs = cultivarsBySpecies[sp.id] || [];

            return (
              <div key={sp.id} className={`card overflow-hidden ${isActive ? 'ring-1 ring-green-300' : ''}`}>
                {/* En-tête espèce — cliquable */}
                <button
                  type="button"
                  onClick={() => toggleExpand(sp.id)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-lg sm:text-xl flex-shrink-0">{getSpeciesIcon(sp.name, sp.category)}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="En culture" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{sp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] sm:text-xs font-medium px-1.5 py-0 rounded-full ${CATEGORY_COLORS[sp.category] || 'bg-gray-100 text-gray-600'}`}>
                        {sp.category}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400">{cvs.length} cultivar{cvs.length !== 1 ? 's' : ''}</span>
                      {sp.family && sp.family !== 'À déterminer' && (
                        <span className="text-[10px] text-gray-300 italic hidden sm:inline">{sp.family}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => openEditSpecies(sp, e)} className="btn-ghost p-1 hidden sm:block" aria-label={`Modifier ${sp.name}`}>
                      <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button onClick={(e) => confirmDelete(sp, 'species', e)} className="btn-ghost p-1 text-red-500 hidden sm:block" aria-label={`Supprimer ${sp.name}`}>
                      <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {/* Cultivars dépliés */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {cvs.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-400">
                        Aucun cultivar pour cette espèce
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {cvs.map((cv) => {
                          const cvActive = activeCultivarIds.has(cv.id);
                          const cvPlantings = plantingsByCultivar[cv.id] || [];
                          return (
                            <div key={cv.id} className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-white transition-colors">
                              <span className="text-gray-300 text-xs">└</span>
                              {cvActive && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-800">{cv.name}</p>
                                {cvPlantings.length > 0 && (
                                  <p className="text-[10px] sm:text-xs text-gray-400">
                                    {cvPlantings.length} plantation{cvPlantings.length > 1 ? 's' : ''}
                                    <span className="hidden sm:inline">{' — '}{cvPlantings.map((p) => p.bed?.name).filter(Boolean).join(', ')}</span>
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {cvActive && (
                                  <span className="text-[10px] px-1 py-0 rounded bg-green-100 text-green-700">actif</span>
                                )}
                                <button onClick={() => openEditCultivar(cv)} className="btn-ghost p-1 hidden sm:block" aria-label={`Modifier ${cv.name}`}>
                                  <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button onClick={() => confirmDelete(cv, 'cultivar')} className="btn-ghost p-1 text-red-500 hidden sm:block" aria-label={`Supprimer ${cv.name}`}>
                                  <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Bouton ajouter cultivar */}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button
                        onClick={(e) => openCreateCultivar(sp.id, e)}
                        className="text-sm text-green-700 hover:text-green-900 font-medium flex items-center gap-1"
                      >
                        <PlusIcon className="h-3.5 w-3.5" /> Ajouter un cultivar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal espèce */}
      <Modal isOpen={speciesModalOpen} onClose={() => setSpeciesModalOpen(false)} title={editingSpecies ? "Modifier l'espèce" : 'Nouvelle espèce'}>
        <form onSubmit={handleSpeciesSubmit} className="space-y-4">
          <div>
            <label htmlFor="sp-name" className="form-label">Nom *</label>
            <input id="sp-name" type="text" required value={speciesForm.name} onChange={(e) => setSpeciesForm((f) => ({ ...f, name: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label htmlFor="sp-family" className="form-label">Famille botanique</label>
            <input id="sp-family" type="text" value={speciesForm.family} onChange={(e) => setSpeciesForm((f) => ({ ...f, family: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label htmlFor="sp-category" className="form-label">Catégorie *</label>
            <select id="sp-category" value={speciesForm.category} onChange={(e) => setSpeciesForm((f) => ({ ...f, category: e.target.value }))} className="form-input">
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sp-notes" className="form-label">Notes</label>
            <textarea id="sp-notes" value={speciesForm.notes} onChange={(e) => setSpeciesForm((f) => ({ ...f, notes: e.target.value }))} className="form-input" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSpeciesModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">{editingSpecies ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal cultivar */}
      <Modal isOpen={cultivarModalOpen} onClose={() => setCultivarModalOpen(false)} title={editingCultivar ? 'Modifier le cultivar' : 'Nouveau cultivar'}>
        <form onSubmit={handleCultivarSubmit} className="space-y-4">
          <div>
            <label htmlFor="cv-name" className="form-label">Nom *</label>
            <input id="cv-name" type="text" required value={cultivarForm.name} onChange={(e) => setCultivarForm((f) => ({ ...f, name: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label htmlFor="cv-species" className="form-label">Espèce *</label>
            <select id="cv-species" required value={cultivarForm.speciesId} onChange={(e) => setCultivarForm((f) => ({ ...f, speciesId: e.target.value }))} className="form-input">
              <option value="">Choisir une espèce…</option>
              {species.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cv-desc" className="form-label">Description</label>
            <textarea id="cv-desc" value={cultivarForm.description} onChange={(e) => setCultivarForm((f) => ({ ...f, description: e.target.value }))} className="form-input" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCultivarModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">{editingCultivar ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteType === 'species' ? "Supprimer l'espèce" : 'Supprimer le cultivar'}
        message={
          deleteType === 'species'
            ? `Supprimer "${deleteTarget?.name}" et tous ses cultivars ?`
            : `Supprimer le cultivar "${deleteTarget?.name}" ?`
        }
        confirmLabel="Supprimer"
        isLoading={deleteLoading}
      />
    </div>
  );
}
