import { NavLink } from 'react-router-dom';
import { useSeason } from '../../context/SeasonContext';

const navSections = [
  {
    label: null, // pas de titre pour la section d'accueil
    items: [
      { emoji: '🏠', label: 'Tableau de bord', path: '/dashboard' },
    ],
  },
  {
    label: 'Production',
    items: [
      { emoji: '🌱', label: 'Cultures', path: '/cultures' },
      { emoji: '🗺️', label: 'Parcelles', path: '/parcelles' },
      { emoji: '🌿', label: 'Pépinière', path: '/pepiniere' },
      { emoji: '🌾', label: 'Graines', path: '/graines' },
    ],
  },
  {
    label: 'Planification',
    items: [
      { emoji: '📅', label: 'Calendrier', path: '/calendrier' },
      { emoji: '✅', label: 'Tâches', path: '/taches' },
      { emoji: '🥬', label: 'Récoltes', path: '/recoltes' },
    ],
  },
  {
    label: 'Référentiel',
    items: [
      { emoji: '📋', label: 'Fiches techniques', path: '/fiches-techniques' },
      { emoji: '🏪', label: 'Fournisseurs', path: '/fournisseurs' },
    ],
  },
  {
    label: 'Suivi',
    items: [
      { emoji: '📸', label: 'Journal', path: '/journal' },
      { emoji: '📊', label: 'Analytique', path: '/analytique' },
      { emoji: '☁️', label: 'Météo', path: '/meteo' },
    ],
  },
  {
    label: null,
    items: [
      { emoji: '⚙️', label: 'Paramètres', path: '/parametres' },
    ],
  },
];

export default function Sidebar() {
  const { seasons, activeSeason, selectSeason } = useSeason();

  const handleSeasonChange = (e) => {
    const seasonId = e.target.value;
    const season = seasons.find((s) => s.id === seasonId);
    if (season) selectSeason(season);
  };

  return (
    <aside
      className="flex flex-col w-[260px] min-h-screen bg-[#1B5E20] text-white shadow-xl"
      aria-label="Navigation principale"
    >
      {/* Logo et titre */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-green-700">
        <span className="text-2xl" aria-hidden="true">🌿</span>
        <span className="text-lg font-bold tracking-tight">MalaMaraichage</span>
      </div>

      {/* Sélecteur de saison */}
      <div className="px-4 py-3 border-b border-green-700">
        <label
          htmlFor="season-select"
          className="block text-xs font-semibold text-green-200 uppercase tracking-wider mb-1"
        >
          Saison active
        </label>
        <select
          id="season-select"
          value={activeSeason?.id ?? ''}
          onChange={handleSeasonChange}
          className="w-full bg-green-800 text-white text-sm rounded-md px-3 py-1.5 border border-green-600 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          aria-label="Sélectionner la saison active"
        >
          {!seasons || seasons.length === 0 ? (
            <option value="">Aucune saison</option>
          ) : (
            seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Navigation par sections */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Menu principal">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.label && (
              <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-green-300 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <ul role="list">
              {section.items.map(({ emoji, label, path }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors rounded-md mx-2 my-0.5',
                        isActive
                          ? 'bg-white text-[#1B5E20] shadow-sm'
                          : 'text-green-100 hover:bg-green-700 hover:text-white',
                      ].join(' ')
                    }
                    aria-label={label}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
