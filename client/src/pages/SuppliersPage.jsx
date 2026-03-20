import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ─── Formulaire fournisseur ───────────────────────────────────────────────────

function SupplierForm({ supplier, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    siret: supplier?.siret || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    website: supplier?.website || '',
    address: supplier?.address || '',
    notes: supplier?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Le nom est requis.');
    setLoading(true);
    try {
      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, form);
        toast.success('Fournisseur mis à jour');
      } else {
        await api.post('/suppliers', form);
        toast.success('Fournisseur créé');
      }
      onSuccess();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="form-input"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('name', 'Nom *', 'text', 'Ex: Vilmorin')}
        {field('siret', 'SIRET', 'text', '12345678901234')}
        {field('email', 'Email', 'email', 'contact@fournisseur.fr')}
        {field('phone', 'Téléphone', 'tel', '0123456789')}
        {field('website', 'Site web', 'url', 'https://...')}
      </div>
      <div>
        <label className="form-label">Adresse</label>
        <textarea
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="form-input"
          rows={2}
          placeholder="Rue, code postal, ville"
        />
      </div>
      <div>
        <label className="form-label">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="form-input"
          rows={2}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" /> : supplier ? 'Mettre à jour' : 'Créer'}
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Carte fournisseur ────────────────────────────────────────────────────────

function SupplierCard({ supplier, onEdit, onDelete, onExpand, expanded }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
            <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-500">
              {supplier.email && <span>{supplier.email}</span>}
              {supplier.phone && <span>{supplier.phone}</span>}
              {supplier.siret && <span>SIRET : {supplier.siret}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="badge bg-blue-50 text-blue-700 text-xs">
            {supplier._count?.invoices || 0} facture{(supplier._count?.invoices || 0) !== 1 ? 's' : ''}
          </span>
          <button onClick={(e) => onEdit(e, supplier)} className="btn-ghost p-1.5" aria-label="Modifier">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => onDelete(e, supplier)} className="btn-ghost p-1.5 text-red-500" aria-label="Supprimer">
            <TrashIcon className="h-4 w-4" />
          </button>
          <button onClick={(e) => onExpand(e, supplier.id)} className="btn-ghost p-1.5" aria-label="Voir les factures">
            {expanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {supplier.address && (
        <p className="text-xs text-gray-400 mt-2 ml-13">{supplier.address}</p>
      )}
      {supplier.website && (
        <a
          href={supplier.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-1 block ml-13"
        >
          {supplier.website}
        </a>
      )}

      {/* Factures */}
      {expanded && supplier.invoices && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique des factures</p>
          {supplier.invoices.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune facture importée.</p>
          ) : (
            supplier.invoices.map((inv) => (
              <div key={inv.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-gray-800">N° {inv.number}</span>
                    {inv.date && (
                      <span className="text-xs text-gray-500 ml-2">
                        {format(parseISO(inv.date.split('T')[0]), 'd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                    {inv.fileName && (
                      <a
                        href={`http://localhost:3001/uploads/invoices/${inv.fileName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline ml-2"
                      >
                        📄 PDF
                      </a>
                    )}
                  </div>
                  {inv.totalAmount != null && (
                    <span className="text-sm font-semibold text-green-700">
                      {parseFloat(inv.totalAmount).toFixed(2)} €
                    </span>
                  )}
                </div>
                {inv.lines?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {inv.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[60%]">
                          {line.cultivar ? (
                            <span className="font-medium text-green-700">{line.cultivar.name}</span>
                          ) : (
                            <span className="italic text-gray-400">{line.description || line.rawText}</span>
                          )}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {line.quantityG != null ? `${parseFloat(line.quantityG)}g` : ''}
                          {line.totalPrice != null ? ` · ${parseFloat(line.totalPrice).toFixed(2)} €` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleExpand = async (e, id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!expandedData[id]) {
      try {
        const res = await api.get(`/suppliers/${id}`);
        setExpandedData((d) => ({ ...d, [id]: res.data }));
      } catch {
        toast.error('Erreur lors du chargement des factures');
      }
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/suppliers/${deleteTarget.id}`);
      toast.success('Fournisseur supprimé');
      setDeleteTarget(null);
      fetchSuppliers();
    } catch {
      toast.error('Impossible de supprimer ce fournisseur (des factures y sont liées ?)');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getSupplierWithData = (s) => {
    if (expandedId === s.id && expandedData[s.id]) {
      return { ...s, invoices: expandedData[s.id].invoices };
    }
    return s;
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title">🏪 Fournisseurs</h1>
        <button
          onClick={() => { setEditingSupplier(null); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Nouveau fournisseur
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : suppliers.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">🏪</p>
          <p>Aucun fournisseur enregistré</p>
          <button onClick={() => setModalOpen(true)} className="btn-ghost mt-3 text-sm">
            + Ajouter un fournisseur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div key={s.id} className="cursor-pointer" onClick={() => navigate(`/fournisseurs/${s.id}`)}>
              <SupplierCard
                supplier={getSupplierWithData(s)}
                onEdit={(e, sup) => { e.stopPropagation(); setEditingSupplier(sup); setModalOpen(true); }}
                onDelete={(e, sup) => { e.stopPropagation(); setDeleteTarget(sup); }}
                onExpand={(e, id) => { e.stopPropagation(); handleExpand(id); }}
                expanded={expandedId === s.id}
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        size="lg"
      >
        <SupplierForm
          supplier={editingSupplier}
          onSuccess={() => { setModalOpen(false); fetchSuppliers(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le fournisseur"
        message={`Supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isLoading={deleteLoading}
      />
    </div>
  );
}
