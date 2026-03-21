import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  DocumentDuplicateIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSeason } from '../context/SeasonContext';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// --- Onglet Profil ---
function ProfileTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', form);
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success('Mot de passe modifié');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Informations du profil */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Informations personnelles</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="form-label">Nom complet</label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="form-label">Adresse e-mail</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="form-input"
            />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Changement de mot de passe */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Changer le mot de passe</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="current-pw" className="form-label">Mot de passe actuel</label>
            <input
              id="current-pw"
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
              className="form-input"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="new-pw" className="form-label">Nouveau mot de passe</label>
            <input
              id="new-pw"
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
              className="form-input"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="form-label">Confirmer le mot de passe</label>
            <input
              id="confirm-pw"
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
              className="form-input"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={savingPw} className="btn-primary">
            {savingPw ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Onglet Saisons ---
function SeasonsTab() {
  const { seasons, activeSeason, selectSeason } = useSeason();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/seasons', form);
      toast.success('Saison créée');
      setModalOpen(false);
      window.location.reload();
    } catch {
      toast.error('Erreur lors de la création de la saison');
    }
  };

  const handleArchive = async (season) => {
    try {
      await api.patch(`/seasons/${season.id}/archive`);
      toast.success('Saison archivée');
      window.location.reload();
    } catch {
      toast.error("Impossible d'archiver la saison");
    }
  };

  const handleDuplicate = async (season) => {
    try {
      await api.post(`/seasons/${season.id}/duplicate`);
      toast.success('Saison dupliquée');
      window.location.reload();
    } catch {
      toast.error("Impossible de dupliquer la saison");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Nouvelle saison
        </button>
      </div>

      <div className="space-y-3">
        {(seasons || []).map((season) => (
          <div key={season.id} className="card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {season.id === activeSeason?.id && (
                <CheckBadgeIcon className="h-5 w-5 text-green-600 flex-shrink-0" aria-label="Saison active" />
              )}
              <div>
                <p className="font-semibold text-gray-900">{season.name}</p>
                <p className="text-xs text-gray-500">
                  {season.start_date && format(parseISO(season.start_date), 'd MMM yyyy', { locale: fr })}
                  {' → '}
                  {season.end_date && format(parseISO(season.end_date), 'd MMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectSeason(season)}
                className="btn-ghost text-xs px-2 py-1"
                aria-label={`Activer la saison ${season.name}`}
              >
                Activer
              </button>
              <button
                onClick={() => handleDuplicate(season)}
                className="btn-ghost p-1.5"
                aria-label={`Dupliquer la saison ${season.name}`}
                title="Dupliquer"
              >
                <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleArchive(season)}
                className="btn-ghost p-1.5 text-gray-400"
                aria-label={`Archiver la saison ${season.name}`}
                title="Archiver"
              >
                <ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle saison">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="season-name" className="form-label">Nom de la saison *</label>
            <input
              id="season-name"
              type="text"
              required
              placeholder="ex. Saison 2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="season-start" className="form-label">Début</label>
              <input
                id="season-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="season-end" className="form-label">Fin</label>
              <input
                id="season-end"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" className="btn-primary flex-1">Créer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- Onglet Exploitation ---
function ExploitationTab() {
  const [form, setForm] = useState({
    name: '',
    location: '',
    default_bed_length: '',
    default_bed_width: '',
    hourly_rate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/exploitation');
        if (res.data) {
          setForm({
            name: res.data.name ?? '',
            location: res.data.location ?? '',
            default_bed_length: res.data.default_bed_length ?? '',
            default_bed_width: res.data.default_bed_width ?? '',
            hourly_rate: res.data.hourly_rate ?? '',
          });
        }
      } catch {
        /* Les paramètres peuvent ne pas exister encore */
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/exploitation', form);
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>;

  return (
    <div className="max-w-lg">
      <div className="card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="exploit-name" className="form-label">Nom de l'exploitation</label>
            <input
              id="exploit-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="exploit-location" className="form-label">Localisation</label>
            <input
              id="exploit-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="form-input"
              placeholder="ex. Lyon, France"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exploit-bed-l" className="form-label">Longueur planche par défaut (m)</label>
              <input
                id="exploit-bed-l"
                type="number"
                step="0.1"
                min="0"
                value={form.default_bed_length}
                onChange={(e) => setForm((f) => ({ ...f, default_bed_length: e.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="exploit-bed-w" className="form-label">Largeur planche par défaut (m)</label>
              <input
                id="exploit-bed-w"
                type="number"
                step="0.1"
                min="0"
                value={form.default_bed_width}
                onChange={(e) => setForm((f) => ({ ...f, default_bed_width: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="exploit-rate" className="form-label">Taux horaire (€/h)</label>
            <input
              id="exploit-rate"
              type="number"
              step="0.01"
              min="0"
              value={form.hourly_rate}
              onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
              className="form-input"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Onglet Export ---
const FORMATS = [
  { key: 'xlsx', label: 'Excel', ext: 'xlsx', icon: '📗', color: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' },
  { key: 'pdf',  label: 'PDF',   ext: 'pdf',  icon: '📕', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' },
  { key: 'csv',  label: 'CSV',   ext: 'csv',  icon: '📄', color: 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100' },
];

const EXPORTS = [
  { label: 'Plantations', entity: 'plantings', icon: '🌱' },
  { label: 'Récoltes',    entity: 'harvests',  icon: '🥬' },
  { label: 'Tâches',      entity: 'tasks',     icon: '✅' },
  { label: 'Graines',     entity: 'seeds',     icon: '🌾' },
  { label: 'Pépinière',   entity: 'nursery',   icon: '🌿' },
  { label: 'Météo',       entity: 'weather',   icon: '☀️' },
];

function ExportTab() {
  const { activeSeason } = useSeason();
  const [loading, setLoading] = useState(null);

  const handleExport = async (entity, format, ext) => {
    const key = `${entity}-${format}`;
    setLoading(key);
    try {
      const res = await api.get(`/export/${entity}`, {
        params: { format, season_id: activeSeason?.id },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${format.toUpperCase()} téléchargé`);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="card p-3 sm:p-4 mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-500">Saison :</span>
        <span className="font-semibold text-gray-900">{activeSeason?.name || '—'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map(({ label, entity, icon }) => (
          <div key={entity} className="card p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-lg" aria-hidden="true">{icon}</span>
              <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
            </div>
            <div className="flex gap-2">
              {FORMATS.map((f) => {
                const key = `${entity}-${f.key}`;
                const isLoading = loading === key;
                return (
                  <button
                    key={f.key}
                    onClick={() => handleExport(entity, f.key, f.ext)}
                    disabled={!!loading}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 ${f.color}`}
                    aria-label={`Exporter ${label} en ${f.label}`}
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'profil', label: 'Profil' },
  { id: 'saisons', label: 'Saisons' },
  { id: 'exploitation', label: 'Exploitation' },
  { id: 'export', label: 'Export' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profil');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">⚙️ Paramètres</h1>
      </div>

      {/* Onglets */}
      <div
        className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4 sm:mb-6 w-full sm:w-fit overflow-x-auto"
        role="tablist"
        aria-label="Onglets paramètres"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.id
                ? 'bg-white text-[#1B5E20] shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'profil' && <ProfileTab />}
        {activeTab === 'saisons' && <SeasonsTab />}
        {activeTab === 'exploitation' && <ExploitationTab />}
        {activeTab === 'export' && <ExportTab />}
      </div>
    </div>
  );
}
