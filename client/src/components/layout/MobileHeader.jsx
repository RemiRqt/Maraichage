import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSeason } from '../../context/SeasonContext';

const menuSections = [
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
    ],
  },
  {
    label: null,
    items: [
      { emoji: '⚙️', label: 'Paramètres', path: '/parametres' },
    ],
  },
];

export default function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { seasons, activeSeason, selectSeason } = useSeason();
  const navigate = useNavigate();

  const handleNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Header fixe */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-[#1B5E20] text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="text-sm font-bold tracking-tight">MalaMaraichage</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sélecteur saison compact */}
          <select
            value={activeSeason?.id ?? ''}
            onChange={(e) => {
              const s = seasons.find((s) => s.id === e.target.value);
              if (s) selectSeason(s);
            }}
            className="bg-green-800 text-white text-[10px] rounded px-1.5 py-1 border border-green-600 max-w-[100px]"
          >
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-green-700 transition-colors"
            aria-label="Menu"
          >
            {menuOpen
              ? <XMarkIcon className="h-5 w-5" />
              : <Bars3Icon className="h-5 w-5" />
            }
          </button>
        </div>
      </header>

      {/* Menu plein écran */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-white" role="dialog" aria-label="Menu navigation">
          {/* Header du menu */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1B5E20] text-white">
            <span className="text-sm font-bold">Navigation</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 rounded-lg hover:bg-green-700"
              aria-label="Fermer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Sections */}
          <nav className="overflow-y-auto h-[calc(100vh-52px)] pb-20">
            {menuSections.map((section, i) => (
              <div key={i}>
                {section.label && (
                  <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    {section.label}
                  </p>
                )}
                {section.items.map(({ emoji, label, path }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-green-50 text-[#1B5E20] border-l-4 border-[#1B5E20]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <span className="text-lg">{emoji}</span>
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
