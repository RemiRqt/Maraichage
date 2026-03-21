import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  ChevronRightIcon,
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

function SupplierCard({ supplier, onEdit, onDelete, onClick }) {
  const invoiceCount = supplier._count?.invoices || 0;
  const seedCount = supplier._count?.seedInventory || 0;

  return (
    <div
      className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Fournisseur ${supplier.name}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icône */}
        <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
          <BuildingStorefrontIcon className="h-5.5 w-5.5 text-green-700" />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{supplier.name}</h3>
            <ChevronRightIcon className="h-4 w-4 text-gray-300 group-hover:text-green-600 flex-shrink-0 transition-colors" />
          </div>

          {/* Coordonnées */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
            {supplier.email && (
              <span className="flex items-center gap-1">
                <EnvelopeIcon className="h-3 w-3 text-gray-400" /> {supplier.email}
              </span>
            )}
            {supplier.phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="h-3 w-3 text-gray-400" /> {supplier.phone}
              </span>
            )}
            {supplier.website && (
              <span className="flex items-center gap-1">
                <GlobeAltIcon className="h-3 w-3 text-gray-400" />
                <span className="truncate max-w-[150px]">{supplier.website.replace(/^https?:\/\//, '')}</span>
              </span>
            )}
            {supplier.address && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3 text-gray-400" />
                <span className="truncate max-w-[200px]">{supplier.address}</span>
              </span>
            )}
          </div>

          {/* Badges + actions */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex gap-2">
              <span className="badge bg-blue-50 text-blue-700 text-xs">
                {invoiceCount} facture{invoiceCount !== 1 ? 's' : ''}
              </span>
              {seedCount > 0 && (
                <span className="badge bg-green-50 text-green-700 text-xs">
                  {seedCount} réf. en stock
                </span>
              )}
              {supplier.siret && (
                <span className="badge bg-gray-50 text-gray-500 text-xs hidden sm:inline-flex">
                  SIRET {supplier.siret}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}
                className="btn-ghost p-1.5"
                aria-label="Modifier"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(supplier); }}
                className="btn-ghost p-1.5 text-red-500"
                aria-label="Supprimer"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
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

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">🏪 Fournisseurs</h1>
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
            Ajouter un fournisseur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <SupplierCard
              key={s.id}
              supplier={s}
              onClick={() => navigate(`/fournisseurs/${s.id}`)}
              onEdit={(sup) => { setEditingSupplier(sup); setModalOpen(true); }}
              onDelete={(sup) => setDeleteTarget(sup)}
            />
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
