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

// Indicateur de niveau de stock avec couleur
function StockIndicator({ current, max }) {
  if (current === undefined || max === undefined || max == 0) return null;
  const pct = (current / max) * 100;
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-orange-400' : 'bg-red-500';
  const textColor = pct > 50 ? 'text-green-700' : pct > 20 ? 'text-orange-700' : 'text-red-700';

  return (
    <div className="flex items-center gap-2" aria-label={`Stock : ${current}/${max} graines`}>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`text-xs font-medium w-24 text-right ${textColor}`}>
        {current} / {max} graines
      </span>
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
    <div className="mb-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
        <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
        Stock faible
      </h2>
      <div className="flex flex-wrap gap-2">
        {lowStock.map((s) => (
          <span key={s.id} className="badge bg-red-100 text-red-700 text-xs">
            ⚠️ {s.cultivar_name} ({s.quantity} graines restantes)
          </span>
        ))}
      </div>
    </div>
  );
}

// Formulaire de stock de graines
function SeedStockForm({ seed, cultivars, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    cultivar_id: seed?.cultivar_id ?? '',
    supplier: seed?.supplier ?? '',
    initial_quantity: seed?.initial_quantity ?? '',
    quantity: seed?.quantity ?? '',
    purchase_url: seed?.purchase_url ?? '',
    notes: seed?.notes ?? '',
  });

  const handleSubmit = async (e) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="seed-cultivar" className="form-label">Cultivar *</label>
          <select
            id="seed-cultivar"
            required
            value={form.cultivar_id}
            onChange={(e) => setForm((f) => ({ ...f, cultivar_id: e.target.value }))}
            className="form-input"
          >
            <option value="">Choisir un cultivar…</option>
            {cultivars.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.species_name || c.species?.name})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="seed-supplier" className="form-label">Fournisseur</label>
          <input
            id="seed-supplier"
            type="text"
            value={form.supplier}
            onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="seed-initial" className="form-label">Quantité initiale (graines)</label>
          <input
            id="seed-initial"
            type="number"
            step="1"
            min="0"
            value={form.initial_quantity}
            onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="seed-quantity" className="form-label">Stock actuel (graines)</label>
          <input
            id="seed-quantity"
            type="number"
            step="1"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            className="form-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="seed-url" className="form-label">URL de rachat</label>
          <input
            id="seed-url"
            type="url"
            value={form.purchase_url}
            onChange={(e) => setForm((f) => ({ ...f, purchase_url: e.target.value }))}
            className="form-input"
            placeholder="https://…"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
        <button type="submit" className="btn-primary flex-1">
          {seed ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1=upload, 2=valider, 3=terminé
  const [importData, setImportData] = useState(null); // données parsées
  const [importSuppliers, setImportSuppliers] = useState([]); // liste fournisseurs existants
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  const handleBuyRedirect = (seed) => {
    if (seed.purchase_url) {
      window.open(seed.purchase_url, '_blank', 'noopener,noreferrer');
    } else {
      toast('Aucune URL de rachat disponible', { icon: 'ℹ️' });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-6">
        <h1 className="page-title">🌾 Graines</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <DocumentArrowUpIcon className="h-4 w-4" aria-hidden="true" />
            Importer PDF
          </button>
          <button
            onClick={() => { setEditingSeed(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nouveau stock
          </button>
        </div>
      </div>

      {/* Alertes stock faible */}
      {!loading && <LowStockAlerts seeds={seeds} />}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un cultivar…"
            className="form-input pl-9"
            aria-label="Rechercher dans les graines"
          />
        </div>
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="form-input w-auto"
          aria-label="Filtrer par fournisseur"
        >
          <option value="">Tous fournisseurs</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau des stocks */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : seeds.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🌾</p>
          <p>Aucun stock de graines</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Inventaire des graines">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cultivar</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fournisseur</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[180px]">Stock</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seeds.map((seed) => {
                  return (
                    <tr key={seed.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{seed.cultivar_name}</p>
                        {seed.species_name && (
                          <p className="text-xs text-gray-400">{seed.species_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{seed.supplier || '–'}</td>
                      <td className="px-4 py-3">
                        <StockIndicator
                          current={seed.quantity}
                          max={seed.initial_quantity}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleBuyRedirect(seed)}
                            className="btn-ghost p-1.5 text-green-600"
                            aria-label={`Racheter ${seed.cultivar_name}`}
                            title="Racheter"
                          >
                            <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => { setEditingSeed(seed); setModalOpen(true); }}
                            className="btn-ghost p-1.5"
                            aria-label={`Modifier ${seed.cultivar_name}`}
                          >
                            <PencilIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(seed)}
                            className="btn-ghost p-1.5 text-red-500"
                            aria-label={`Supprimer le stock de ${seed.cultivar_name}`}
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal stock */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSeed ? 'Modifier le stock' : 'Nouveau stock de graines'}
        size="lg"
      >
        <SeedStockForm
          seed={editingSeed}
          cultivars={cultivars}
          onSuccess={() => { setModalOpen(false); fetchData(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Modal import PDF — 3 étapes */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportStep(1);
          setImportData(null);
        }}
        title={
          importStep === 1 ? 'Importer une facture PDF' :
          importStep === 2 ? 'Valider les données extraites' :
          'Import terminé'
        }
        size="xl"
      >
        {/* Étape 1 — Upload */}
        {importStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Importez une facture fournisseur au format PDF. Les données seront extraites automatiquement pour validation.
            </p>
            <div>
              <label htmlFor="pdf-upload" className="form-label">Fichier PDF *</label>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="form-input"
                disabled={importLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
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
                      // Copier les lignes pour permettre l'édition
                      lines: parseRes.data.lines.map((l) => ({ ...l })),
                    });
                    setImportSuppliers(suppliersRes.data || []);
                    setImportStep(2);
                  } catch {
                    toast.error("Erreur lors de l'analyse du PDF");
                  } finally {
                    setImportLoading(false);
                  }
                }}
              />
            </div>
            {importLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <LoadingSpinner size="sm" /> Analyse en cours…
              </div>
            )}
            <button type="button" onClick={() => setImportModalOpen(false)} className="btn-secondary w-full">
              Annuler
            </button>
          </div>
        )}

        {/* Étape 2 — Validation */}
        {importStep === 2 && importData && (
          <div className="space-y-5">
            {/* Fournisseur */}
            <div className="card p-4 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Fournisseur existant</label>
                  <select
                    className="form-input"
                    value={importData.supplier.id || ''}
                    onChange={(e) => {
                      const found = importSuppliers.find((s) => s.id === e.target.value);
                      setImportData((d) => ({
                        ...d,
                        supplier: found
                          ? { id: found.id, name: found.name, siret: found.siret || '', email: found.email || '', phone: found.phone || '', website: found.website || '', address: found.address || '' }
                          : { ...d.supplier, id: '' },
                      }));
                    }}
                  >
                    <option value="">— Nouveau fournisseur —</option>
                    {importSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importData.supplier.name || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, name: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">SIRET</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importData.supplier.siret || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, siret: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={importData.supplier.email || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, email: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importData.supplier.phone || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, phone: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">Site web</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importData.supplier.website || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, supplier: { ...d.supplier, website: e.target.value } }))}
                  />
                </div>
              </div>
            </div>

            {/* Facture */}
            <div className="card p-4 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Facture</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="form-label">N° de facture *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importData.invoice.number || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, number: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={importData.invoice.date || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, date: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="form-label">Total TTC (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={importData.invoice.totalAmount || ''}
                    onChange={(e) => setImportData((d) => ({ ...d, invoice: { ...d.invoice, totalAmount: e.target.value } }))}
                  />
                </div>
              </div>
            </div>

            {/* Lignes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Lignes détectées ({importData.lines.length})
                </p>
                <p className="text-xs text-gray-400">Associez chaque ligne à un cultivar pour créer le stock</p>
              </div>

              {/* Alerte lignes sans correspondance */}
              {(() => {
                const unmatched = importData.lines.filter((l) => !l.cultivarId).length;
                return unmatched > 0 ? (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-800">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{unmatched} ligne{unmatched > 1 ? 's' : ''} sans cultivar associé — vérifiez manuellement.</span>
                  </div>
                ) : null;
              })()}

              {importData.lines.length === 0 ? (
                <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  Aucune ligne détectée automatiquement.
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-400">Voir le texte brut</summary>
                    <pre className="mt-1 text-xs text-gray-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {importData.texteExtrait}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {importData.lines.map((line, idx) => {
                    const confidence = line.matchConfidence || 'none';
                    const confidenceBadge = {
                      high:   { label: '✓ Haute', cls: 'bg-green-100 text-green-700' },
                      medium: { label: '~ Partielle', cls: 'bg-yellow-100 text-yellow-700' },
                      low:    { label: '? Faible', cls: 'bg-orange-100 text-orange-700' },
                      none:   { label: '✗ Aucune', cls: 'bg-red-100 text-red-700' },
                    }[confidence];

                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 bg-white ${
                          confidence === 'none' || confidence === 'low'
                            ? 'border-orange-300'
                            : 'border-gray-200'
                        }`}
                      >
                        <p className="text-xs text-gray-400 truncate mb-2">{line.rawText}</p>
                        {/* Ligne 1 : ref + description + cultivar */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {line.reference && (
                            <div className="sm:col-span-1">
                              <label className="form-label">Référence</label>
                              <input
                                type="text"
                                className="form-input text-sm bg-gray-50"
                                readOnly
                                value={line.reference}
                              />
                            </div>
                          )}
                          <div className={line.reference ? 'sm:col-span-1' : 'sm:col-span-2'}>
                            <label className="form-label">Description</label>
                            <input
                              type="text"
                              className="form-input text-sm"
                              value={line.description || ''}
                              onChange={(e) => {
                                const lines = [...importData.lines];
                                lines[idx] = { ...lines[idx], description: e.target.value };
                                setImportData((d) => ({ ...d, lines }));
                              }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="form-label mb-0">Cultivar</label>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${confidenceBadge.cls}`}>
                                {confidenceBadge.label}
                              </span>
                            </div>
                            <select
                              className="form-input text-sm"
                              value={line.cultivarId || ''}
                              onChange={(e) => {
                                const lines = [...importData.lines];
                                lines[idx] = { ...lines[idx], cultivarId: e.target.value || null };
                                setImportData((d) => ({ ...d, lines }));
                              }}
                            >
                              <option value="">— Non associé —</option>
                              {cultivars.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            {(confidence === 'low' || confidence === 'none') && line.matchCandidates?.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-xs text-gray-400">Suggestions :</p>
                                {line.matchCandidates.map((cand) => (
                                  <button
                                    key={cand.cultivarId}
                                    type="button"
                                    className="block text-xs text-blue-600 hover:underline text-left"
                                    onClick={() => {
                                      const lines = [...importData.lines];
                                      lines[idx] = { ...lines[idx], cultivarId: cand.cultivarId, matchConfidence: 'medium' };
                                      setImportData((d) => ({ ...d, lines }));
                                    }}
                                  >
                                    → {cand.name}{cand.species ? ` (${cand.species})` : ''} [{cand.score}]
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ligne 2 : prix + conditionnement + nombre paquets */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          <div>
                            <label className="form-label">Prix unitaire (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input text-sm"
                              value={line.unitPrice ?? ''}
                              onChange={(e) => {
                                const lines = [...importData.lines];
                                lines[idx] = { ...lines[idx], unitPrice: e.target.value ? parseFloat(e.target.value) : null };
                                setImportData((d) => ({ ...d, lines }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="form-label">
                              Qté / paquet
                              {line.unitType && <span className="ml-1 text-gray-400">({line.unitType})</span>}
                            </label>
                            <input
                              type="number"
                              step="1"
                              className="form-input text-sm"
                              value={line.unitQty ?? ''}
                              onChange={(e) => {
                                const lines = [...importData.lines];
                                lines[idx] = { ...lines[idx], unitQty: e.target.value ? parseFloat(e.target.value) : null };
                                setImportData((d) => ({ ...d, lines }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="form-label">Nb paquets</label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              className="form-input text-sm"
                              value={line.qtyOrdered ?? 1}
                              onChange={(e) => {
                                const lines = [...importData.lines];
                                lines[idx] = { ...lines[idx], qtyOrdered: e.target.value ? parseInt(e.target.value) : 1 };
                                setImportData((d) => ({ ...d, lines }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="form-label">Total (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input text-sm bg-gray-50"
                              readOnly
                              value={
                                line.unitPrice != null && line.qtyOrdered != null
                                  ? (parseFloat(line.unitPrice) * parseInt(line.qtyOrdered)).toFixed(2)
                                  : (line.totalPrice ?? '')
                              }
                            />
                          </div>
                        </div>

                        {/* Infos secondaires */}
                        {(line.lotNumber || line.expiryDate || line.tvaRate != null) && (
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            {line.tvaRate != null && <span>TVA : {line.tvaRate}%</span>}
                            {line.lotNumber && <span>Lot : {line.lotNumber}</span>}
                            {line.expiryDate && <span>DLU : {line.expiryDate}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setImportStep(1); setImportData(null); }}
                className="btn-secondary"
              >
                ← Retour
              </button>
              <button
                type="button"
                disabled={confirmLoading || !importData.supplier.name || !importData.invoice.number}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    const res = await api.post('/seeds/confirm-import', {
                      supplier: importData.supplier,
                      invoice: { ...importData.invoice, fileName: importData.invoice.fileName },
                      lines: importData.lines,
                    });
                    toast.success(res.data.message);
                    setImportStep(3);
                    fetchData();
                  } catch (err) {
                    if (err.response?.status === 409) {
                      toast.error(err.response.data.message);
                    } else {
                      toast.error("Erreur lors de l'enregistrement");
                    }
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
              >
                {confirmLoading ? <LoadingSpinner size="sm" /> : null}
                Confirmer l'import
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 — Succès */}
        {importStep === 3 && (
          <div className="text-center space-y-4 py-4">
            <p className="text-5xl">✅</p>
            <p className="text-lg font-semibold text-green-800">Facture importée avec succès</p>
            <p className="text-sm text-gray-500">Le stock de graines a été mis à jour et la facture est enregistrée dans l'historique fournisseur.</p>
            <button
              type="button"
              onClick={() => { setImportModalOpen(false); setImportStep(1); setImportData(null); }}
              className="btn-primary"
            >
              Fermer
            </button>
          </div>
        )}
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
