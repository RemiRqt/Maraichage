import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSpeciesIcon } from '../utils/speciesIcons';

// Indicateur de niveau de stock
function StockIndicator({ current, max }) {
  if (current === undefined || max === undefined || max == 0) return null;
  const pct = (current / max) * 100;
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-orange-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{Math.round(pct)}%</span>
    </div>
  );
}

// Alertes de stock bas
function LowStockAlerts({ seeds }) {
  const lowStock = seeds.filter((s) => {
    if (!s.quantity || !s.initial_quantity) return false;
    return (s.quantity / s.initial_quantity) <= 0.2;
  });

  if (lowStock.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1.5">
        {lowStock.map((s) => (
          <span key={s.id} className="badge bg-red-100 text-red-700 text-[10px]">
            ⚠️ {s.cultivar_name} ({s.quantity})
          </span>
        ))}
      </div>
    </div>
  );
}

// Formulaire unifié : ajout manuel OU import PDF
function SeedAddForm({ cultivars, onSuccess, onCancel, seed }) {
  const [mode, setMode] = useState(seed ? 'manual' : 'manual'); // 'manual' | 'pdf'
  const [form, setForm] = useState({
    cultivar_id: seed?.cultivar_id ?? '',
    supplier: seed?.supplier ?? '',
    initial_quantity: seed?.initial_quantity ?? '',
    quantity: seed?.quantity ?? '',
    purchase_url: seed?.purchase_url ?? '',
    notes: seed?.notes ?? '',
  });
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importSuppliers, setImportSuppliers] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      if (seed) {
        await api.put(`/seeds/${seed.id}`, form);
        toast.success('Stock mis à jour');
      } else {
        await api.post('/seeds', form);
        toast.success('Stock créé');
      }
      onSuccess();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImportLoading(true);
    try {
      const [parseRes, suppliersRes] = await Promise.all([
        api.post('/seeds/import-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        api.get('/suppliers'),
      ]);
      setImportData({
        ...parseRes.data,
        lines: parseRes.data.lines.map((l) => ({ ...l })),
      });
      setImportSuppliers(suppliersRes.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Erreur lors de l'analyse du PDF";
      toast.error(msg);
      console.error('Import PDF error:', err.response?.data || err);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setConfirmLoading(true);
    try {
      const res = await api.post('/seeds/confirm-import', {
        supplier: importData.supplier,
        invoice: importData.invoice,
        lines: importData.lines,
      });
      toast.success(res.data.message);
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  // Mode PDF — étape validation
  if (mode === 'pdf' && importData) {
    return (
      <div className="space-y-4">
        {/* Fournisseur */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Fournisseur</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="form-label text-xs">Existant</label>
              <select className="form-input text-sm" value={importData.supplier.id || ''}
                onChange={(e) => {
                  const found = importSuppliers.find((s) => s.id === e.target.value);
                  setImportData((d) => ({ ...d, supplier: found ? { id: found.id, name: found.name, siret: found.siret || '', email: found.email || '', phone: found.phone || '', website: found.website || '', address: found.address || '' } : { ...d.supplier, id: '' } }));
                }}>
                <option value="">— Nouveau —</option>
                {importSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Nom *</label>
              <input type="text" className="form-input text-sm" value={importData.supplier.name || ''}
                onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, name: e.target.value } }))} />
            </div>
          </div>
        </div>

        {/* Facture */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Facture</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="form-label text-xs">N° *</label>
              <input type="text" className="form-input text-sm" value={importData.invoice.number || ''}
                onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, number: e.target.value } }))} />
            </div>
            <div>
              <label className="form-label text-xs">Date</label>
              <input type="date" className="form-input text-sm" value={importData.invoice.date || ''}
                onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, date: e.target.value } }))} />
            </div>
            <div>
              <label className="form-label text-xs">Total (€)</label>
              <input type="number" step="0.01" className="form-input text-sm" value={importData.invoice.totalAmount || ''}
                onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, totalAmount: e.target.value } }))} />
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Lignes ({importData.lines.length})</p>
          {importData.lines.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune ligne détectée.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {importData.lines.map((line, idx) => {
                const conf = line.matchConfidence || 'none';
                const confCls = { high: 'border-green-300', medium: 'border-yellow-300', low: 'border-orange-300', none: 'border-red-300' }[conf];
                return (
                  <div key={idx} className={`border rounded-lg p-2.5 bg-white ${confCls}`}>
                    <p className="text-[10px] text-gray-400 truncate mb-1.5">{line.description || line.rawText}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <select className="form-input text-xs py-1" value={line.cultivarId || ''}
                          onChange={(e) => {
                            const lines = [...importData.lines];
                            lines[idx] = { ...lines[idx], cultivarId: e.target.value || null };
                            setImportData((d) => ({ ...d, lines }));
                          }}>
                          <option value="">— Cultivar —</option>
                          {cultivars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <input type="number" className="form-input text-xs py-1" placeholder="Qté" value={line.unitQty ?? ''}
                          onChange={(e) => {
                            const lines = [...importData.lines];
                            lines[idx] = { ...lines[idx], unitQty: e.target.value ? parseFloat(e.target.value) : null };
                            setImportData((d) => ({ ...d, lines }));
                          }} />
                      </div>
                      <div>
                        <input type="number" step="0.01" className="form-input text-xs py-1" placeholder="Prix €" value={line.unitPrice ?? ''}
                          onChange={(e) => {
                            const lines = [...importData.lines];
                            lines[idx] = { ...lines[idx], unitPrice: e.target.value ? parseFloat(e.target.value) : null };
                            setImportData((d) => ({ ...d, lines }));
                          }} />
                      </div>
                    </div>
                    {line.matchCandidates?.length > 0 && !line.cultivarId && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {line.matchCandidates.map((c) => (
                          <button key={c.cultivarId} type="button" className="text-[10px] text-blue-600 hover:underline"
                            onClick={() => {
                              const lines = [...importData.lines];
                              lines[idx] = { ...lines[idx], cultivarId: c.cultivarId };
                              setImportData((d) => ({ ...d, lines }));
                            }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => setImportData(null)} className="btn-secondary">Retour</button>
          <button type="button" onClick={handleConfirmImport} disabled={confirmLoading || !importData.supplier.name || !importData.invoice.number}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {confirmLoading && <LoadingSpinner size="sm" />} Confirmer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de mode — seulement si pas en édition */}
      {!seed && (
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
          <button type="button" onClick={() => setMode('manual')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === 'manual' ? 'bg-white text-[#1B5E20] shadow-sm font-semibold' : 'text-gray-500'}`}>
            <PlusIcon className="h-4 w-4" /> Saisie manuelle
          </button>
          <button type="button" onClick={() => setMode('pdf')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === 'pdf' ? 'bg-white text-[#1B5E20] shadow-sm font-semibold' : 'text-gray-500'}`}>
            <DocumentArrowUpIcon className="h-4 w-4" /> Import PDF
          </button>
        </div>
      )}

      {/* Mode PDF upload */}
      {mode === 'pdf' && !importData && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Importez une facture fournisseur au format PDF.</p>
          <input id="pdf-upload" type="file" accept=".pdf" className="form-input" disabled={importLoading}
            onChange={(e) => handlePdfUpload(e.target.files?.[0])} />
          {importLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" /> Analyse en cours…
            </div>
          )}
          <button type="button" onClick={onCancel} className="btn-secondary w-full">Annuler</button>
        </div>
      )}

      {/* Mode manuel */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="form-label">Cultivar *</label>
            <select required value={form.cultivar_id} onChange={(e) => setForm((f) => ({ ...f, cultivar_id: e.target.value }))} className="form-input">
              <option value="">Choisir…</option>
              {cultivars.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.species_name || c.species?.name})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Fournisseur</label>
              <input type="text" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Qté initiale</label>
              <input type="number" min="0" value={form.initial_quantity} onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Stock actuel</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">URL rachat</label>
              <input type="url" value={form.purchase_url} onChange={(e) => setForm((f) => ({ ...f, purchase_url: e.target.value }))} className="form-input" placeholder="https://…" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">{seed ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      )}
    </div>
  );
}

// Carte de graine (mobile-friendly)
function SeedCard({ seed, onEdit, onDelete, onBuy }) {
  const pct = seed.initial_quantity > 0 ? Math.round((seed.quantity / seed.initial_quantity) * 100) : null;
  const pctColor = pct > 50 ? 'text-green-700 bg-green-50' : pct > 20 ? 'text-orange-700 bg-orange-50' : 'text-red-700 bg-red-50';

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{getSpeciesIcon(seed.species_name)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm text-gray-900 truncate">{seed.cultivar_name}</p>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {seed.purchase_url && (
                <button onClick={() => onBuy(seed)} className="btn-ghost p-1 text-green-600" title="Racheter">
                  <ShoppingCartIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => onEdit(seed)} className="btn-ghost p-1" title="Modifier">
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(seed)} className="btn-ghost p-1 text-red-500" title="Supprimer">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">{seed.species_name}{seed.supplier ? ` · ${seed.supplier}` : ''}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1">
              <StockIndicator current={seed.quantity} max={seed.initial_quantity} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-bold text-gray-900">{seed.quantity ?? 0}</span>
              <span className="text-[10px] text-gray-400">/ {seed.initial_quantity ?? 0}</span>
              {pct !== null && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pctColor}`}>{pct}%</span>
              )}
            </div>
          </div>
          {(seed.lot_number || seed.expiry_date) && (
            <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
              {seed.lot_number && <span>Lot: {seed.lot_number}</span>}
              {seed.expiry_date && <span>Exp: {format(parseISO(seed.expiry_date.split('T')[0]), 'dd/MM/yy')}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState([]);
  const [cultivars, setCultivars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [seedsRes, cultivarsRes] = await Promise.all([
        api.get('/seeds', { params: { search: search || undefined, supplier: filterSupplier || undefined } }),
        api.get('/cultivars'),
      ]);
      setSeeds(seedsRes.data || []);
      setCultivars(cultivarsRes.data || []);
    } catch {
      toast.error('Erreur lors du chargement des graines');
    } finally {
      setLoading(false);
    }
  }, [search, filterSupplier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const suppliers = [...new Set(seeds.map((s) => s.supplier).filter(Boolean))];

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/seeds/${deleteTarget.id}`);
      toast.success('Stock supprimé');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Impossible de supprimer ce stock');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBuy = (seed) => {
    if (seed.purchase_url) {
      window.open(seed.purchase_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtrage côté client
  const filtered = seeds.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(s.cultivar_name || '').toLowerCase().includes(q) && !(s.species_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats
  const totalRefs = filtered.length;
  const totalStock = filtered.reduce((s, seed) => s + (seed.quantity || 0), 0);
  const lowCount = filtered.filter((s) => s.initial_quantity > 0 && (s.quantity / s.initial_quantity) <= 0.2).length;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-4 sm:mb-5">
        <h1 className="page-title text-lg sm:text-xl">🌾 Graines</h1>
        <button onClick={() => { setEditingSeed(null); setModalOpen(true); }} className="btn-primary flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Ajouter du stock</span>
        </button>
      </div>

      {/* Stats compactes */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card p-2.5 text-center">
            <p className="text-lg font-bold text-gray-900">{totalRefs}</p>
            <p className="text-[10px] text-gray-500">Références</p>
          </div>
          <div className="card p-2.5 text-center">
            <p className="text-lg font-bold text-green-700">{totalStock}</p>
            <p className="text-[10px] text-gray-500">Graines en stock</p>
          </div>
          <div className="card p-2.5 text-center">
            <p className={`text-lg font-bold ${lowCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowCount}</p>
            <p className="text-[10px] text-gray-500">Stock faible</p>
          </div>
        </div>
      )}

      {/* Alertes */}
      {!loading && <LowStockAlerts seeds={filtered} />}

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…" className="form-input pl-8 text-sm" />
        </div>
        <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className="form-input w-auto text-sm">
          <option value="">Fournisseur</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🌾</p>
          <p>Aucun stock de graines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((seed) => (
            <SeedCard
              key={seed.id}
              seed={seed}
              onEdit={(s) => { setEditingSeed(s); setModalOpen(true); }}
              onDelete={(s) => setDeleteTarget(s)}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}

      {/* Modal unifié */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editingSeed ? 'Modifier le stock' : 'Ajouter du stock'} size="lg">
        <SeedAddForm
          seed={editingSeed}
          cultivars={cultivars}
          onSuccess={() => { setModalOpen(false); fetchData(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le stock"
        message={`Supprimer le stock de "${deleteTarget?.cultivar_name}" ?`}
        confirmLabel="Supprimer"
        isLoading={deleteLoading}
      />
    </div>
  );
}
