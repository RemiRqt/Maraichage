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
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TABS = [
  { key: 'info', label: 'Informations' },
  { key: 'invoices', label: 'Factures' },
  { key: 'stock', label: 'Stock lié' },
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

// ─── Onglet factures ──────────────────────────────────────────────────────────
function InvoicesTab({ invoices, supplierId, onDeleteInvoice }) {
  const [expanded, setExpanded] = useState(null);

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
    <div className="space-y-3">
      {invoices.map((inv) => (
        <div key={inv.id} className="card p-4">
          {/* En-tête facture */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">N° {inv.number}</span>
                {inv.date && (
                  <span className="text-xs text-gray-500">
                    {format(parseISO(inv.date.split('T')[0]), 'd MMMM yyyy', { locale: fr })}
                  </span>
                )}
                {inv.fileName && (
                  <a
                    href={`http://localhost:3001/uploads/invoices/${inv.fileName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <DocumentArrowDownIcon className="h-3.5 w-3.5" /> PDF
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Importée le {format(parseISO(inv.importedAt.split('T')[0]), 'd MMM yyyy', { locale: fr })}
                {' · '}{inv.lines?.length || 0} ligne{(inv.lines?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {inv.totalAmount != null && (
                <span className="font-semibold text-green-700">
                  {parseFloat(inv.totalAmount).toFixed(2)} €
                </span>
              )}
              <button
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                className="btn-ghost text-xs py-1 px-2"
              >
                {expanded === inv.id ? '▲ Masquer' : '▼ Lignes'}
              </button>
              <button
                onClick={() => onDeleteInvoice(inv)}
                className="btn-ghost p-1.5 text-red-500"
                aria-label="Supprimer la facture"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lignes de facture */}
          {expanded === inv.id && inv.lines?.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Réf.</th>
                      <th className="text-left pb-2 font-medium">Produit</th>
                      <th className="text-left pb-2 font-medium">Conditionnement</th>
                      <th className="text-right pb-2 font-medium">Qté cmd.</th>
                      <th className="text-right pb-2 font-medium">Prix U.</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                      <th className="text-left pb-2 font-medium">Cultivar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((line) => (
                      <tr key={line.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 pr-2 font-mono text-gray-400">{line.reference || '—'}</td>
                        <td className="py-1.5 pr-2 font-medium text-gray-800 max-w-[200px] truncate">
                          {line.description || line.rawText}
                        </td>
                        <td className="py-1.5 pr-2 text-gray-500">{line.packaging || '—'}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">{line.qtyOrdered ?? '—'}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">
                          {line.unitPrice != null ? `${parseFloat(line.unitPrice).toFixed(2)} €` : '—'}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-medium text-green-700">
                          {line.totalPrice != null ? `${parseFloat(line.totalPrice).toFixed(2)} €` : '—'}
                        </td>
                        <td className="py-1.5 text-purple-700">
                          {line.cultivar ? line.cultivar.name : <span className="text-gray-300 italic">non associé</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
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
    <div className="space-y-2">
      {stock.map((s) => (
        <div key={s.id} className="card p-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm text-gray-800">{s.cultivar?.name || '—'}</p>
            <p className="text-xs text-gray-500">{s.cultivar?.species?.name || ''}</p>
          </div>
          <div className="flex gap-4 text-xs text-gray-500 flex-shrink-0">
            {s.weightGrams != null && <span>{parseFloat(s.weightGrams)}g</span>}
            {s.unitPriceEuros != null && <span>{parseFloat(s.unitPriceEuros).toFixed(2)} €</span>}
            {s.purchaseDate && <span>{format(parseISO(s.purchaseDate.split('T')[0]), 'dd/MM/yyyy')}</span>}
          </div>
        </div>
      ))}
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
    <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/fournisseurs')} className="btn-ghost p-2">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
          {supplier.email && <p className="text-sm text-gray-500">{supplier.email}</p>}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
            {tab.key === 'invoices' && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
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
          supplierId={supplierId}
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
