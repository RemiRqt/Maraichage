import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { getSpeciesIcon } from '../utils/speciesIcons';

// Badge coloré pour la méthode de semis
function SowingBadge({ method }) {
  if (!method) return null;
  const styles = {
    PEPINIERE: 'bg-purple-100 text-purple-700',
    SEMIS_DIRECT: 'bg-blue-100 text-blue-700',
    LES_DEUX: 'bg-teal-100 text-teal-700',
  };
  const labels = {
    PEPINIERE: 'Pépinière',
    SEMIS_DIRECT: 'Semis direct',
    LES_DEUX: 'Les deux',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[method] || 'bg-gray-100 text-gray-600'}`}>
      {labels[method] || method}
    </span>
  );
}

// Section dépliable
function Section({ title, icon, children, defaultOpen = false, onEdit, editing }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span> {title}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && !editing && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit(); }}}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-green-700 transition-colors"
              title="Modifier"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </span>
          )}
          {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Ligne de données clé-valeur
function DataRow({ label, value, unit }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        {unit && <span className="text-gray-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

// Champ de formulaire inline
function Field({ label, value, onChange, type = 'number', step, unit, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}{required && ' *'}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
          step={step || (type === 'number' ? 'any' : undefined)}
          className="form-input text-sm py-1.5"
          placeholder={placeholder}
          required={required}
        />
        {unit && <span className="text-xs text-gray-400 flex-shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

// Boutons sauvegarder / annuler
function FormActions({ onSave, onCancel, saving }) {
  return (
    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
      <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
        <XMarkIcon className="h-3.5 w-3.5" /> Annuler
      </button>
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
        <CheckIcon className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

// Formulaire pépinière
function NurseryChartForm({ data, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState({
    containerType: data?.containerType || '',
    seedsPerCell: data?.seedsPerCell ?? 1,
    technique: data?.technique || '',
    germinationDays: data?.germinationDays ?? '',
    germinationTempC: data?.germinationTempC ?? '',
  });
  const [repotStages, setRepotStages] = useState(
    data?.repotStages?.map((s) => ({ stageNumber: s.stageNumber, containerType: s.containerType, daysAfterSowing: s.daysAfterSowing })) || []
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contenant" value={form.containerType} onChange={(v) => set('containerType', v)} type="text" required />
        <Field label="Graines / cellule" value={form.seedsPerCell} onChange={(v) => set('seedsPerCell', v)} required />
        <Field label="Technique" value={form.technique} onChange={(v) => set('technique', v)} type="text" />
        <Field label="Jours germination" value={form.germinationDays} onChange={(v) => set('germinationDays', v)} unit="j" required />
        <Field label="Temp. germination" value={form.germinationTempC} onChange={(v) => set('germinationTempC', v)} unit="°C" />
      </div>
      {/* Rempotages */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">Rempotages</p>
          <button type="button" onClick={() => setRepotStages((s) => [...s, { stageNumber: s.length + 1, containerType: '', daysAfterSowing: '' }])} className="text-xs text-green-700 hover:underline flex items-center gap-0.5">
            <PlusIcon className="h-3 w-3" /> Ajouter
          </button>
        </div>
        {repotStages.map((s, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex-shrink-0">{i + 1}</span>
            <input type="text" value={s.containerType} onChange={(e) => { const arr = [...repotStages]; arr[i].containerType = e.target.value; setRepotStages(arr); }} className="form-input text-sm py-1 flex-1" placeholder="Contenant" />
            <input type="number" value={s.daysAfterSowing} onChange={(e) => { const arr = [...repotStages]; arr[i].daysAfterSowing = Number(e.target.value); setRepotStages(arr); }} className="form-input text-sm py-1 w-20" placeholder="Jours" />
            <span className="text-xs text-gray-400">j</span>
            <button type="button" onClick={() => setRepotStages((arr) => arr.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-0.5">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {data && onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <TrashIcon className="h-3.5 w-3.5" /> Supprimer la charte
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Annuler
          </button>
          <button type="button" onClick={() => onSave({ ...form, repotStages })} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <CheckIcon className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulaire transplantation
function TransplantChartForm({ data, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState({
    rowCount: data?.rowCount ?? '',
    rowSpacingCm: data?.rowSpacingCm ? parseFloat(data.rowSpacingCm) : '',
    plantSpacingCm: data?.plantSpacingCm ? parseFloat(data.plantSpacingCm) : '',
    nurseryDurationDays: data?.nurseryDurationDays ?? '',
    daysToMaturity: data?.daysToMaturity ?? '',
    harvestWindowDays: data?.harvestWindowDays ?? '',
    sowWeekStart: data?.sowWeekStart ?? '',
    sowWeekEnd: data?.sowWeekEnd ?? '',
    safetyMarginPct: data?.safetyMarginPct ?? '',
    plantsPerM2: data?.plantsPerM2 ? parseFloat(data.plantsPerM2) : '',
    plantsPerM2WithMargin: data?.plantsPerM2WithMargin ? parseFloat(data.plantsPerM2WithMargin) : '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Nb rangs" value={form.rowCount} onChange={(v) => set('rowCount', v)} required />
        <Field label="Espacement rangs" value={form.rowSpacingCm} onChange={(v) => set('rowSpacingCm', v)} unit="cm" required />
        <Field label="Espacement plants" value={form.plantSpacingCm} onChange={(v) => set('plantSpacingCm', v)} unit="cm" required />
        <Field label="Durée pépinière" value={form.nurseryDurationDays} onChange={(v) => set('nurseryDurationDays', v)} unit="j" />
        <Field label="JAM" value={form.daysToMaturity} onChange={(v) => set('daysToMaturity', v)} unit="j" required />
        <Field label="Fenêtre récolte" value={form.harvestWindowDays} onChange={(v) => set('harvestWindowDays', v)} unit="j" required />
        <Field label="Semaine début" value={form.sowWeekStart} onChange={(v) => set('sowWeekStart', v)} />
        <Field label="Semaine fin" value={form.sowWeekEnd} onChange={(v) => set('sowWeekEnd', v)} />
        <Field label="Marge sécurité" value={form.safetyMarginPct} onChange={(v) => set('safetyMarginPct', v)} unit="%" />
        <Field label="Plants / m²" value={form.plantsPerM2} onChange={(v) => set('plantsPerM2', v)} />
        <Field label="Plants / m² (+ marge)" value={form.plantsPerM2WithMargin} onChange={(v) => set('plantsPerM2WithMargin', v)} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {data && onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <TrashIcon className="h-3.5 w-3.5" /> Supprimer la charte
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Annuler
          </button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <CheckIcon className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulaire semis direct
function DirectSowChartForm({ data, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState({
    rowCount: data?.rowCount ?? '',
    rowSpacingCm: data?.rowSpacingCm ? parseFloat(data.rowSpacingCm) : '',
    daysToMaturity: data?.daysToMaturity ?? '',
    harvestWindowDays: data?.harvestWindowDays ?? '',
    safetyMarginPct: data?.safetyMarginPct ?? '',
    sowWeekStart: data?.sowWeekStart ?? '',
    sowWeekEnd: data?.sowWeekEnd ?? '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Nb rangs" value={form.rowCount} onChange={(v) => set('rowCount', v)} required />
        <Field label="Espacement rangs" value={form.rowSpacingCm} onChange={(v) => set('rowSpacingCm', v)} unit="cm" required />
        <Field label="JAM" value={form.daysToMaturity} onChange={(v) => set('daysToMaturity', v)} unit="j" required />
        <Field label="Fenêtre récolte" value={form.harvestWindowDays} onChange={(v) => set('harvestWindowDays', v)} unit="j" required />
        <Field label="Marge sécurité" value={form.safetyMarginPct} onChange={(v) => set('safetyMarginPct', v)} unit="%" />
        <Field label="Semaine début" value={form.sowWeekStart} onChange={(v) => set('sowWeekStart', v)} />
        <Field label="Semaine fin" value={form.sowWeekEnd} onChange={(v) => set('sowWeekEnd', v)} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {data && onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <TrashIcon className="h-3.5 w-3.5" /> Supprimer la charte
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Annuler
          </button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <CheckIcon className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Formulaire rendement
function YieldChartForm({ data, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState({
    saleUnit: data?.saleUnit || '',
    weightPerUnitG: data?.weightPerUnitG ? parseFloat(data.weightPerUnitG) : '',
    pricePerUnit: data?.pricePerUnit ? parseFloat(data.pricePerUnit) : '',
    yieldQtyPer30m: data?.yieldQtyPer30m ? parseFloat(data.yieldQtyPer30m) : '',
    yieldKgPer30m: data?.yieldKgPer30m ? parseFloat(data.yieldKgPer30m) : '',
    revenuePer30m: data?.revenuePer30m ? parseFloat(data.revenuePer30m) : '',
    harvestDays: data?.harvestDays ?? '',
    revenuePerDayPerM: data?.revenuePerDayPerM ? parseFloat(data.revenuePerDayPerM) : '',
    yieldKgPerDayPerM: data?.yieldKgPerDayPerM ? parseFloat(data.yieldKgPerDayPerM) : '',
    harvestsPerWeek: data?.harvestsPerWeek ? parseFloat(data.harvestsPerWeek) : '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Unité de vente" value={form.saleUnit} onChange={(v) => set('saleUnit', v)} type="text" required />
        <Field label="Poids / unité" value={form.weightPerUnitG} onChange={(v) => set('weightPerUnitG', v)} unit="g" />
        <Field label="Prix / unité" value={form.pricePerUnit} onChange={(v) => set('pricePerUnit', v)} unit="€" />
        <Field label="Rendement / 30m" value={form.yieldQtyPer30m} onChange={(v) => set('yieldQtyPer30m', v)} unit="unités" />
        <Field label="Rendement / 30m" value={form.yieldKgPer30m} onChange={(v) => set('yieldKgPer30m', v)} unit="kg" />
        <Field label="Revenu / 30m" value={form.revenuePer30m} onChange={(v) => set('revenuePer30m', v)} unit="€" />
        <Field label="Jours de récolte" value={form.harvestDays} onChange={(v) => set('harvestDays', v)} unit="j" />
        <Field label="€ / jour / m" value={form.revenuePerDayPerM} onChange={(v) => set('revenuePerDayPerM', v)} />
        <Field label="Kg / jour / m" value={form.yieldKgPerDayPerM} onChange={(v) => set('yieldKgPerDayPerM', v)} />
        <Field label="Récoltes / semaine" value={form.harvestsPerWeek} onChange={(v) => set('harvestsPerWeek', v)} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {data && onDelete && (
          <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <TrashIcon className="h-3.5 w-3.5" /> Supprimer la charte
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Annuler
          </button>
          <button type="button" onClick={() => onSave(form)} disabled={saving} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
            <CheckIcon className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Carte d'une fiche technique complète
function CultureSheetCard({ sheet, onUpdate }) {
  const { species, nurseryChart, transplantChart, directSowChart, yieldChart, taskTemplates } = sheet;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(null); // 'nursery' | 'transplant' | 'directSow' | 'yield'
  const [saving, setSaving] = useState(false);

  // Enregistre une sous-charte
  const handleSave = async (chartType, data) => {
    setSaving(true);
    try {
      // Nettoyer les valeurs vides
      const cleaned = {};
      for (const [k, v] of Object.entries(data)) {
        cleaned[k] = v === '' ? null : v;
      }
      await api.put(`/culture-sheets/${sheet.id}`, { [chartType]: cleaned });
      toast.success('Charte mise à jour');
      setEditing(null);
      onUpdate();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // Supprime une sous-charte
  const handleDelete = async (chartType) => {
    setSaving(true);
    try {
      await api.put(`/culture-sheets/${sheet.id}`, { [chartType]: null });
      toast.success('Charte supprimée');
      setEditing(null);
      onUpdate();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* En-tête */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">
            {getSpeciesIcon(species?.name, species?.category)}
          </span>
          <div className="text-left">
            <p className="font-semibold text-gray-900">{species?.name}</p>
            <p className="text-xs text-gray-400">{species?.family}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SowingBadge method={sheet.sowingMethod} />
          <div className="flex gap-1">
            {nurseryChart && <span className="w-2 h-2 rounded-full bg-purple-400" title="Pépinière" />}
            {transplantChart && <span className="w-2 h-2 rounded-full bg-green-400" title="Transplant" />}
            {directSowChart && <span className="w-2 h-2 rounded-full bg-blue-400" title="Semis direct" />}
            {yieldChart && <span className="w-2 h-2 rounded-full bg-yellow-400" title="Rendement" />}
          </div>
          {expanded ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div>
          {/* Pépinière */}
          {(nurseryChart || editing === 'nursery') && (
            <Section title="Pépinière" icon="🌱" defaultOpen onEdit={() => setEditing('nursery')} editing={editing === 'nursery'}>
              {editing === 'nursery' ? (
                <NurseryChartForm
                  data={nurseryChart}
                  onSave={(data) => handleSave('nurseryChart', data)}
                  onCancel={() => setEditing(null)}
                  onDelete={nurseryChart ? () => handleDelete('nurseryChart') : null}
                  saving={saving}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <DataRow label="Contenant" value={nurseryChart.containerType} />
                    <DataRow label="Graines / cellule" value={nurseryChart.seedsPerCell} />
                    <DataRow label="Technique" value={nurseryChart.technique} />
                    <DataRow label="Jours germination" value={nurseryChart.germinationDays} unit="j" />
                    <DataRow label="Temp. germination" value={nurseryChart.germinationTempC} unit="°C" />
                  </div>
                  {nurseryChart.repotStages?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rempotages</p>
                      <div className="space-y-1">
                        {nurseryChart.repotStages.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{s.stageNumber}</span>
                            <span className="text-gray-700">{s.containerType}</span>
                            <span className="text-gray-400">— {s.daysAfterSowing} j après semis</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {/* Transplantation */}
          {(transplantChart || editing === 'transplant') && (
            <Section title="Transplantation" icon="🌿" onEdit={() => setEditing('transplant')} editing={editing === 'transplant'}>
              {editing === 'transplant' ? (
                <TransplantChartForm
                  data={transplantChart}
                  onSave={(data) => handleSave('transplantChart', data)}
                  onCancel={() => setEditing(null)}
                  onDelete={transplantChart ? () => handleDelete('transplantChart') : null}
                  saving={saving}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <DataRow label="Nb rangs" value={transplantChart.rowCount} />
                  <DataRow label="Espacement rangs" value={parseFloat(transplantChart.rowSpacingCm)} unit="cm" />
                  <DataRow label="Espacement plants" value={parseFloat(transplantChart.plantSpacingCm)} unit="cm" />
                  <DataRow label="Durée pépinière" value={transplantChart.nurseryDurationDays} unit="j" />
                  <DataRow label="JAM" value={transplantChart.daysToMaturity} unit="j" />
                  <DataRow label="Fenêtre récolte" value={transplantChart.harvestWindowDays} unit="j" />
                  <DataRow label="Semaine début" value={transplantChart.sowWeekStart} />
                  <DataRow label="Semaine fin" value={transplantChart.sowWeekEnd} />
                  <DataRow label="Marge sécurité" value={transplantChart.safetyMarginPct} unit="%" />
                  <DataRow label="Plants / m²" value={transplantChart.plantsPerM2 ? parseFloat(transplantChart.plantsPerM2) : null} />
                  <DataRow label="Plants / m² (+ marge)" value={transplantChart.plantsPerM2WithMargin ? parseFloat(transplantChart.plantsPerM2WithMargin) : null} />
                </div>
              )}
            </Section>
          )}

          {/* Semis direct */}
          {(directSowChart || editing === 'directSow') && (
            <Section title="Semis direct" icon="🌾" onEdit={() => setEditing('directSow')} editing={editing === 'directSow'}>
              {editing === 'directSow' ? (
                <DirectSowChartForm
                  data={directSowChart}
                  onSave={(data) => handleSave('directSowChart', data)}
                  onCancel={() => setEditing(null)}
                  onDelete={directSowChart ? () => handleDelete('directSowChart') : null}
                  saving={saving}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <DataRow label="Nb rangs" value={directSowChart.rowCount} />
                  <DataRow label="Espacement rangs" value={parseFloat(directSowChart.rowSpacingCm)} unit="cm" />
                  <DataRow label="JAM" value={directSowChart.daysToMaturity} unit="j" />
                  <DataRow label="Fenêtre récolte" value={directSowChart.harvestWindowDays} unit="j" />
                  <DataRow label="Marge sécurité" value={directSowChart.safetyMarginPct} unit="%" />
                  <DataRow label="Semaine début" value={directSowChart.sowWeekStart} />
                  <DataRow label="Semaine fin" value={directSowChart.sowWeekEnd} />
                </div>
              )}
            </Section>
          )}

          {/* Rendement */}
          {(yieldChart || editing === 'yield') && (
            <Section title="Rendement" icon="📊" onEdit={() => setEditing('yield')} editing={editing === 'yield'}>
              {editing === 'yield' ? (
                <YieldChartForm
                  data={yieldChart}
                  onSave={(data) => handleSave('yieldChart', data)}
                  onCancel={() => setEditing(null)}
                  onDelete={yieldChart ? () => handleDelete('yieldChart') : null}
                  saving={saving}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <DataRow label="Unité de vente" value={yieldChart.saleUnit} />
                  <DataRow label="Poids / unité" value={yieldChart.weightPerUnitG ? parseFloat(yieldChart.weightPerUnitG) : null} unit="g" />
                  <DataRow label="Prix / unité" value={yieldChart.pricePerUnit ? `${parseFloat(yieldChart.pricePerUnit).toFixed(2)} €` : null} />
                  <DataRow label="Rendement / 30m" value={yieldChart.yieldQtyPer30m ? parseFloat(yieldChart.yieldQtyPer30m) : null} unit="unités" />
                  <DataRow label="Rendement / 30m" value={yieldChart.yieldKgPer30m ? parseFloat(yieldChart.yieldKgPer30m) : null} unit="kg" />
                  <DataRow label="Revenu / 30m" value={yieldChart.revenuePer30m ? `${parseFloat(yieldChart.revenuePer30m).toFixed(0)} €` : null} />
                  <DataRow label="Jours de récolte" value={yieldChart.harvestDays} unit="j" />
                  <DataRow label="€ / jour / m" value={yieldChart.revenuePerDayPerM ? parseFloat(yieldChart.revenuePerDayPerM).toFixed(2) : null} />
                  <DataRow label="Kg / jour / m" value={yieldChart.yieldKgPerDayPerM ? parseFloat(yieldChart.yieldKgPerDayPerM).toFixed(2) : null} />
                  <DataRow label="Récoltes / semaine" value={yieldChart.harvestsPerWeek ? parseFloat(yieldChart.harvestsPerWeek) : null} />
                </div>
              )}
            </Section>
          )}

          {/* Boutons pour ajouter les chartes manquantes */}
          {(!nurseryChart || !transplantChart || !directSowChart || !yieldChart) && !editing && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2">
              {!nurseryChart && (
                <button onClick={() => setEditing('nursery')} className="text-xs text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-50 flex items-center gap-1">
                  <PlusIcon className="h-3 w-3" /> Pépinière
                </button>
              )}
              {!transplantChart && (
                <button onClick={() => setEditing('transplant')} className="text-xs text-green-600 hover:text-green-800 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-50 flex items-center gap-1">
                  <PlusIcon className="h-3 w-3" /> Transplantation
                </button>
              )}
              {!directSowChart && (
                <button onClick={() => setEditing('directSow')} className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 flex items-center gap-1">
                  <PlusIcon className="h-3 w-3" /> Semis direct
                </button>
              )}
              {!yieldChart && (
                <button onClick={() => setEditing('yield')} className="text-xs text-yellow-600 hover:text-yellow-800 border border-yellow-200 rounded-lg px-2.5 py-1 hover:bg-yellow-50 flex items-center gap-1">
                  <PlusIcon className="h-3 w-3" /> Rendement
                </button>
              )}
            </div>
          )}

          {/* Tâches */}
          {taskTemplates?.length > 0 && (
            <Section title={`Tâches (${taskTemplates.length})`} icon="✅">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="pb-2">Tâche</th>
                      <th className="pb-2">Quand</th>
                      <th className="pb-2 text-right">Min / m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskTemplates.map((t) => (
                      <tr key={t.id} className="border-t border-gray-50">
                        <td className="py-1.5 text-gray-800">{t.name}</td>
                        <td className="py-1.5">
                          {t.daysOffset > 0 ? (
                            <span className={t.direction === 'AVANT' ? 'text-orange-600' : 'text-green-600'}>
                              {t.daysOffset}j {t.direction === 'AVANT' ? 'avant' : 'après'}
                            </span>
                          ) : (
                            <span className="text-gray-400">À planifier</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-gray-600">
                          {t.minutesPerM2 ? parseFloat(t.minutesPerM2).toFixed(1) : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChartsPage() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterChart, setFilterChart] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/culture-sheets');
      setSheets(res.data || []);
    } catch {
      toast.error('Erreur lors du chargement des fiches techniques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Liste unique d'espèces pour le dropdown
  const speciesList = useMemo(() => {
    const names = sheets
      .map((s) => s.species?.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'));
    return [...new Set(names)];
  }, [sheets]);

  // Filtrage
  const filtered = useMemo(() => {
    return sheets.filter((s) => {
      // Recherche texte
      if (search) {
        const q = search.toLowerCase();
        const name = (s.species?.name || '').toLowerCase();
        const family = (s.species?.family || '').toLowerCase();
        if (!name.includes(q) && !family.includes(q)) return false;
      }
      // Filtre espèce dropdown
      if (selectedSpecies && s.species?.name !== selectedSpecies) return false;
      // Filtre méthode de semis
      if (filterMethod && s.sowingMethod !== filterMethod) return false;
      // Filtre type de charte
      if (filterChart === 'nursery' && !s.nurseryChart) return false;
      if (filterChart === 'transplant' && !s.transplantChart) return false;
      if (filterChart === 'directSow' && !s.directSowChart) return false;
      if (filterChart === 'yield' && !s.yieldChart) return false;
      if (filterChart === 'tasks' && (!s.taskTemplates || s.taskTemplates.length === 0)) return false;
      return true;
    });
  }, [sheets, search, selectedSpecies, filterMethod, filterChart]);

  // Stats
  const stats = useMemo(() => ({
    total: sheets.length,
    nursery: sheets.filter((s) => s.nurseryChart).length,
    transplant: sheets.filter((s) => s.transplantChart).length,
    directSow: sheets.filter((s) => s.directSowChart).length,
    yield: sheets.filter((s) => s.yieldChart).length,
    tasks: sheets.reduce((sum, s) => sum + (s.taskTemplates?.length || 0), 0),
  }), [sheets]);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">📋 Fiches techniques</h1>
      </div>

      {/* Stats résumé */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-5">
          <button onClick={() => { setFilterChart(''); setFilterMethod(''); }} className={`card p-3 text-center hover:shadow-md transition-shadow ${!filterChart ? 'ring-2 ring-green-500' : ''}`}>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Espèces</p>
          </button>
          <button onClick={() => setFilterChart(filterChart === 'nursery' ? '' : 'nursery')} className={`card p-3 text-center hover:shadow-md transition-shadow ${filterChart === 'nursery' ? 'ring-2 ring-purple-500' : ''}`}>
            <p className="text-2xl font-bold text-purple-600">{stats.nursery}</p>
            <p className="text-xs text-gray-500">Pépinière</p>
          </button>
          <button onClick={() => setFilterChart(filterChart === 'transplant' ? '' : 'transplant')} className={`card p-3 text-center hover:shadow-md transition-shadow ${filterChart === 'transplant' ? 'ring-2 ring-green-500' : ''}`}>
            <p className="text-2xl font-bold text-green-600">{stats.transplant}</p>
            <p className="text-xs text-gray-500">Transplants</p>
          </button>
          <button onClick={() => setFilterChart(filterChart === 'directSow' ? '' : 'directSow')} className={`card p-3 text-center hover:shadow-md transition-shadow ${filterChart === 'directSow' ? 'ring-2 ring-blue-500' : ''}`}>
            <p className="text-2xl font-bold text-blue-600">{stats.directSow}</p>
            <p className="text-xs text-gray-500">Semis directs</p>
          </button>
          <button onClick={() => setFilterChart(filterChart === 'yield' ? '' : 'yield')} className={`card p-3 text-center hover:shadow-md transition-shadow ${filterChart === 'yield' ? 'ring-2 ring-yellow-500' : ''}`}>
            <p className="text-2xl font-bold text-yellow-600">{stats.yield}</p>
            <p className="text-xs text-gray-500">Rendements</p>
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une espèce…"
            className="form-input pl-9"
            aria-label="Rechercher"
          />
        </div>
        <select
          value={selectedSpecies}
          onChange={(e) => setSelectedSpecies(e.target.value)}
          className="form-input w-auto"
          aria-label="Sélectionner une espèce"
        >
          <option value="">Toutes les espèces ({filtered.length})</option>
          {speciesList.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="form-input w-auto"
          aria-label="Filtrer par méthode"
        >
          <option value="">Toutes méthodes</option>
          <option value="PEPINIERE">Pépinière</option>
          <option value="SEMIS_DIRECT">Semis direct</option>
          <option value="LES_DEUX">Les deux</option>
        </select>
      </div>

      {/* Liste des fiches */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune fiche technique trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sheet) => (
            <CultureSheetCard key={sheet.id} sheet={sheet} onUpdate={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}
