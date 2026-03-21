import { useState, useEffect, useCallback } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useSeason } from '../context/SeasonContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Indicateur de progression en 3 étapes
function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Paramètres' },
    { num: 2, label: 'Calcul' },
    { num: 3, label: 'Confirmation' },
  ];

  return (
    <nav aria-label="Étapes de planification" className="mb-8">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, idx) => {
          const isDone = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <li key={step.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isDone
                      ? 'bg-[#1B5E20] text-white'
                      : isCurrent
                      ? 'bg-[#1B5E20] text-white ring-4 ring-green-100'
                      : 'bg-gray-200 text-gray-400',
                  ].join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isDone ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : step.num}
                </div>
                <span
                  className={`text-xs font-medium ${isCurrent ? 'text-[#1B5E20]' : 'text-gray-400'}`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 w-16 mx-2 mb-5 ${isDone ? 'bg-[#1B5E20]' : 'bg-gray-200'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Étape 1 : saisie des paramètres
function Step1Form({ cultivars, form, onChange, onNext }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
      <div>
        <label htmlFor="plan-cultivar" className="form-label">Cultivar *</label>
        <select
          id="plan-cultivar"
          required
          value={form.cultivar_id}
          onChange={(e) => onChange('cultivar_id', e.target.value)}
          className="form-input"
        >
          <option value="">Choisir un cultivar…</option>
          {cultivars.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.species?.name})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="plan-target-kg" className="form-label">Objectif de production (kg) *</label>
        <input
          id="plan-target-kg"
          type="number"
          step="0.5"
          min="0.5"
          required
          value={form.target_kg}
          onChange={(e) => onChange('target_kg', e.target.value)}
          className="form-input"
          placeholder="ex. 50"
        />
      </div>

      <div>
        <label htmlFor="plan-harvest-date" className="form-label">Date de récolte souhaitée *</label>
        <input
          id="plan-harvest-date"
          type="date"
          required
          value={form.harvest_date}
          onChange={(e) => onChange('harvest_date', e.target.value)}
          className="form-input"
          min={format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

      <button
        type="submit"
        disabled={!form.cultivar_id || !form.target_kg || !form.harvest_date}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        Calculer
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

// Étape 2 : résultats du calcul
function Step2Results({ results, onNext, onBack }) {
  if (!results) return null;

  const c = results.calculs || {};
  const items = [
    { label: 'Surface nécessaire', value: `${c.surfaceNecessaireM2} m²`, icon: '📐' },
    { label: 'Nombre de planches', value: c.nbPlanchesNecessaires, icon: '🗺️' },
    { label: 'Nombre de plants', value: c.nbPlantsNecessaires, icon: '🌱' },
    { label: 'Graines nécessaires', value: `${c.nbGrainesNecessaires} graines`, icon: '🌾' },
    { label: 'Date de semis idéale', value: c.dateSemisCalculee
      ? format(parseISO(c.dateSemisCalculee), 'd MMMM yyyy', { locale: fr })
      : '–', icon: '📅' },
    { label: 'Heures de travail estimées', value: `${c.totalHeuresTravailEstimees} h`, icon: '⏱️' },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </p>
            <p className="text-xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Retour
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          Choisir les planches
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// Étape 3 : sélection des planches et confirmation
function Step3Confirm({ availableBeds, selectedBedIds, onToggleBed, results, onConfirm, onBack, isSubmitting }) {
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Sélectionner {results?.calculs?.nbPlanchesNecessaires} planche(s)
          <span className="text-gray-400 font-normal ml-2">
            ({selectedBedIds.length}/{results?.calculs?.nbPlanchesNecessaires} sélectionnées)
          </span>
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {availableBeds.map((bed) => {
            const isSelected = selectedBedIds.includes(bed.id);
            return (
              <label
                key={bed.id}
                className={[
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  isSelected
                    ? 'border-[#1B5E20] bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleBed(bed.id)}
                  className="h-4 w-4 rounded text-green-600"
                  aria-label={`Sélectionner la planche ${bed.name}`}
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{bed.name}</p>
                  <p className="text-xs text-gray-400">{bed.zone?.name} — {bed.lengthM}×{bed.widthM}m</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Retour
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting || selectedBedIds.length === 0}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Création en cours…
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
              Créer les plantations
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const { activeSeason } = useSeason();

  const [step, setStep] = useState(1);
  const [cultivars, setCultivars] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [results, setResults] = useState(null);
  const [selectedBedIds, setSelectedBedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [form, setForm] = useState({
    cultivar_id: '',
    target_kg: '',
    harvest_date: '',
  });

  useEffect(() => {
    api.get('/cultivars').then((r) => setCultivars(r.data || [])).catch(() => {});
  }, []);

  const handleFormChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const res = await api.post('/planning/assisted', {
        cultivarId: form.cultivar_id,
        objectifKg: Number(form.target_kg),
        desiredHarvestDate: form.harvest_date,
      });
      setResults(res.data);
      setStep(2);
    } catch {
      toast.error('Erreur lors du calcul de planification');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleLoadBeds = () => {
    // Les planches disponibles sont déjà dans les résultats du calcul
    setAvailableBeds(results?.planchesDisponibles || []);
    setSelectedBedIds([]);
    setStep(3);
  };

  const handleToggleBed = (bedId) => {
    setSelectedBedIds((prev) =>
      prev.includes(bedId)
        ? prev.filter((id) => id !== bedId)
        : [...prev, bedId]
    );
  };

  const handleConfirm = async () => {
    if (selectedBedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.post('/planning/assisted/confirm', {
        cultivarId: form.cultivar_id,
        cultureSheetId: results?.ficheRef?.id,
        seasonId: activeSeason?.id,
        bedIds: selectedBedIds,
        sowingDate: results?.calculs?.dateSemisCalculee,
      });
      toast.success('Plantations et tâches créées avec succès ! 🌱');
      handleReset();
    } catch {
      toast.error('Erreur lors de la création des plantations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setForm({ cultivar_id: '', target_kg: '', harvest_date: '' });
    setResults(null);
    setSelectedBedIds([]);
    setAvailableBeds([]);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="page-header mb-4 sm:mb-6">
        <h1 className="page-title text-lg sm:text-xl">📋 Planification assistée</h1>
        {step > 1 && (
          <button
            onClick={handleReset}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label="Recommencer la planification"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Recommencer
          </button>
        )}
      </div>

      {/* Indicateur d'étapes */}
      <StepIndicator currentStep={step} />

      {/* Contenu de chaque étape */}
      {step === 1 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 text-center">
            Étape 1 — Définissez vos objectifs
          </h2>
          {isCalculating ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <LoadingSpinner />
              <p className="text-sm text-gray-500">Calcul en cours…</p>
            </div>
          ) : (
            <Step1Form
              cultivars={cultivars}
              form={form}
              onChange={handleFormChange}
              onNext={handleCalculate}
            />
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 text-center">
            Étape 2 — Résultats du calcul
          </h2>
          <Step2Results
            results={results}
            onNext={handleLoadBeds}
            onBack={() => setStep(1)}
          />
        </div>
      )}

      {step === 3 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 text-center">
            Étape 3 — Sélectionnez les planches
          </h2>
          <Step3Confirm
            availableBeds={availableBeds}
            selectedBedIds={selectedBedIds}
            onToggleBed={handleToggleBed}
            results={results}
            onConfirm={handleConfirm}
            onBack={() => setStep(2)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}
