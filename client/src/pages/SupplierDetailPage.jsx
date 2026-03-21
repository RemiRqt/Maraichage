import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSpeciesIcon } from '../utils/speciesIcons';

// URL de base du serveur (sans /api/v1)
const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1').replace(/\/api\/v1$/, '');

const TABS = [
  { key: 'invoices', label: 'Factures' },
  { key: 'stock', label: 'Stock lié' },
  { key: 'info', label: 'Informations' },
];

// ─── Onglet informations ──────────────────────────────────────────────────────
function InfoTab({ supplier, onEdit }) {
  const fields = [
    { label: 'Nom', value: supplier.name },
    { label: 'SIRET', value: supplier.siret },
    { label: 'Email', value: supplier.email },
    { label: 'Téléphone', value: supplier.phone },
    { label: 'Site web', value: supplier.website, isLink: true },
    { label: 'Adresse', value: supplier.address },
    { label: 'Notes', value: supplier.notes },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Coordonnées</h2>
          <button onClick={onEdit} className="btn-ghost flex items-center gap-1.5 text-sm">
            <PencilIcon className="h-4 w-4" /> Modifier
          </button>
        </div>
        <dl className="space-y-3">
          {fields.map(({ label, value, isLink }) => value ? (
            <div key={label} className="flex gap-4">
              <dt className="w-28 text-xs font-medium text-gray-500 pt-0.5 flex-shrink-0">{label}</dt>
              <dd className="text-sm text-gray-800">
                {isLink ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value}</a>
                ) : value}
              </dd>
            </div>
          ) : null)}
        </dl>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{supplier._count?.invoices || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Factures importées</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{supplier._count?.seedInventory || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Références en stock</p>
        </div>
      </div>
    </div>
  );
}

// ─── Visionneuse PDF intégrée ─────────────────────────────────────────────────
function PdfViewer({ fileName, onClose }) {
  const pdfUrl = `${SERVER_URL}/uploads/invoices/${fileName}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 text-sm truncate">{fileName}</span>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs px-2 py-1 flex items-center gap-1"
            >
              <DocumentArrowDownIcon className="h-3.5 w-3.5" /> Télécharger
            </a>
            <button onClick={onClose} className="btn-ghost p-1.5">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe
          src={pdfUrl}
          className="flex-1 w-full"
          title="Facture PDF"
        />
      </div>
    </div>
  );
}

// ─── Onglet factures ──────────────────────────────────────────────────────────
function InvoicesTab({ invoices, onDeleteInvoice }) {
  const [viewingPdf, setViewingPdf] = useState(null);

  if (invoices.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-3xl mb-2">📄</p>
        <p>Aucune facture importée pour ce fournisseur.</p>
        <p className="text-xs mt-1">Importez une facture depuis la page Graines.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {invoices.map((inv) => (
          <div key={inv.id} className="card overflow-hidden">
            {/* En-tête facture */}
            <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-semibold text-gray-900 text-sm">N° {inv.number}</span>
                  {inv.date && (
                    <span className="text-xs text-gray-500">
                      {format(parseISO(inv.date.split('T')[0]), 'd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
                {inv.totalAmount != null && (
                  <span className="font-bold text-green-700 text-lg flex-shrink-0">
                    {parseFloat(inv.totalAmount).toFixed(2)} €
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">
                  {inv.lines?.length || 0} ligne{(inv.lines?.length || 0) !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  {inv.fileName && (
                    <button
                      onClick={() => setViewingPdf(inv.fileName)}
                      className="btn-ghost text-xs py-1 px-2 flex items-center gap-1 text-blue-600"
                    >
                      <EyeIcon className="h-3.5 w-3.5" /> PDF
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteInvoice(inv)}
                    className="btn-ghost p-1 text-red-400 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lignes de facture — toujours visibles */}
            {inv.lines?.length > 0 && (
              <div className="divide-y divide-gray-50">
                {inv.lines.map((line) => (
                  <div key={line.id} className="px-3 sm:px-4 py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {line.description || line.rawText}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-gray-400">
                        {line.reference && <span>Réf: {line.reference}</span>}
                        {line.packaging && <span>{line.packaging}</span>}
                        {line.qtyOrdered && <span>Qté: {line.qtyOrdered}</span>}
                        {line.cultivar ? (
                          <span className="text-purple-600 font-medium">{line.cultivar.name}</span>
                        ) : (
                          <span className="italic text-gray-300">non associé</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {line.totalPrice != null && (
                        <p className="text-sm font-semibold text-gray-900">{parseFloat(line.totalPrice).toFixed(2)} €</p>
                      )}
                      {line.unitPrice != null && (
                        <p className="text-[10px] text-gray-400">{parseFloat(line.unitPrice).toFixed(2)} €/u</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visionneuse PDF */}
      {viewingPdf && <PdfViewer fileName={viewingPdf} onClose={() => setViewingPdf(null)} />}
    </>
  );
}

// ─── Onglet stock ─────────────────────────────────────────────────────────────
function StockTab({ supplierId }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/seeds', { params: { supplier_id: supplierId } })
      .then((r) => setStock(r.data || []))
      .catch(() => toast.error('Erreur chargement stock'))
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  if (stock.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-3xl mb-2">🌾</p>
        <p>Aucun stock de graines associé à ce fournisseur.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Cultivar</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Espèce</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">Qté initiale</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">Prix</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Lot</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Achat</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Expiration</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => {
            const pct = s.initial_quantity > 0 ? Math.round((s.quantity / s.initial_quantity) * 100) : null;
            return (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getSpeciesIcon(s.species_name)}</span>
                    <span className="font-medium text-gray-900">{s.cultivar_name || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{s.species_name || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-semibold text-gray-900">{s.quantity}</span>
                    {pct !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pct > 50 ? 'bg-green-100 text-green-700' : pct > 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{s.initial_quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {s.unit_price != null ? `${parseFloat(s.unit_price).toFixed(2)} €` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.lot_number || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {s.purchase_date ? format(parseISO(s.purchase_date.split('T')[0]), 'dd/MM/yy') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {s.expiry_date ? format(parseISO(s.expiry_date.split('T')[0]), 'dd/MM/yy') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Formulaire édition fournisseur ──────────────────────────────────────────
function EditForm({ supplier, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: supplier.name || '',
    siret: supplier.siret || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    website: supplier.website || '',
    address: supplier.address || '',
    notes: supplier.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/suppliers/${supplier.id}`, form);
      toast.success('Fournisseur mis à jour');
      onSuccess();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['name','Nom *'],['siret','SIRET'],['email','Email'],['phone','Téléphone'],['website','Site web']].map(([k, l]) => (
          <div key={k}>
            <label className="form-label">{l}</label>
            <input type="text" className="form-input" value={form[k]} onChange={(e) => setForm(f => ({...f, [k]: e.target.value}))} />
          </div>
        ))}
      </div>
      <div>
        <label className="form-label">Adresse</label>
        <textarea className="form-input" rows={2} value={form.address} onChange={(e) => setForm(f => ({...f, address: e.target.value}))} />
      </div>
      <div>
        <label className="form-label">Notes</label>
        <textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm(f => ({...f, notes: e.target.value}))} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" /> : 'Enregistrer'}
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SupplierDetailPage() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState(null);
  const [deleteInvoiceLoading, setDeleteInvoiceLoading] = useState(false);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/suppliers/${supplierId}`);
      setSupplier(res.data);
    } catch {
      toast.error('Fournisseur introuvable');
      navigate('/fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSupplier(); }, [supplierId]);

  const handleDeleteInvoice = async () => {
    setDeleteInvoiceLoading(true);
    try {
      await api.delete(`/invoices/${deleteInvoiceTarget.id}`);
      toast.success('Facture supprimée');
      setDeleteInvoiceTarget(null);
      fetchSupplier();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteInvoiceLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (!supplier) return null;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/fournisseurs')} className="btn-ghost p-2">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{supplier.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-0.5">
            {supplier.email && <span>{supplier.email}</span>}
            {supplier.phone && <span>{supplier.phone}</span>}
          </div>
        </div>
        <button onClick={() => setEditOpen(true)} className="btn-ghost flex items-center gap-1.5 text-sm flex-shrink-0">
          <PencilIcon className="h-4 w-4" /> Modifier
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-full sm:w-fit" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-white text-[#1B5E20] shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {tab.label}
            {tab.key === 'invoices' && (
              <span className="ml-1.5 text-xs text-gray-400">
                {supplier.invoices?.length || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'info' && (
        <InfoTab supplier={supplier} onEdit={() => setEditOpen(true)} />
      )}
      {activeTab === 'invoices' && (
        <InvoicesTab
          invoices={supplier.invoices || []}
          onDeleteInvoice={setDeleteInvoiceTarget}
        />
      )}
      {activeTab === 'stock' && (
        <StockTab supplierId={supplierId} />
      )}

      {/* Modal édition */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Modifier le fournisseur" size="lg">
        <EditForm
          supplier={supplier}
          onSuccess={() => { setEditOpen(false); fetchSupplier(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Confirmation suppression facture */}
      <ConfirmDialog
        isOpen={!!deleteInvoiceTarget}
        onClose={() => setDeleteInvoiceTarget(null)}
        onConfirm={handleDeleteInvoice}
        title="Supprimer la facture"
        message={`Supprimer la facture N°${deleteInvoiceTarget?.number} ? Les lignes associées seront également supprimées.`}
        confirmLabel="Supprimer"
        isLoading={deleteInvoiceLoading}
      />
    </div>
  );
}
