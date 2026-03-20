import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
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
function Section({ title, icon, children, defaultOpen = false }) {
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
        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
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

// Carte d'une fiche technique complète
function CultureSheetCard({ sheet }) {
  const { species, nurseryChart, transplantChart, directSowChart, yieldChart, taskTemplates } = sheet;
  const [expanded, setExpanded] = useState(false);

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
          {nurseryChart && (
            <Section title="Pépinière" icon="🌱" defaultOpen>
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
            </Section>
          )}

          {/* Transplantation */}
          {transplantChart && (
            <Section title="Transplantation" icon="🌿">
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
            </Section>
          )}

          {/* Semis direct */}
          {directSowChart && (
            <Section title="Semis direct" icon="🌾">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DataRow label="Nb rangs" value={directSowChart.rowCount} />
                <DataRow label="Espacement rangs" value={parseFloat(directSowChart.rowSpacingCm)} unit="cm" />
                <DataRow label="JAM" value={directSowChart.daysToMaturity} unit="j" />
                <DataRow label="Fenêtre récolte" value={directSowChart.harvestWindowDays} unit="j" />
                <DataRow label="Marge sécurité" value={directSowChart.safetyMarginPct} unit="%" />
                <DataRow label="Semaine début" value={directSowChart.sowWeekStart} />
                <DataRow label="Semaine fin" value={directSowChart.sowWeekEnd} />
              </div>
            </Section>
          )}

          {/* Rendement */}
          {yieldChart && (
            <Section title="Rendement" icon="📊">
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
            </Section>
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
            <CultureSheetCard key={sheet.id} sheet={sheet} />
          ))}
        </div>
      )}
    </div>
  );
}
