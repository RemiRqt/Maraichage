import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  SparklesIcon,
  MapIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  BeakerIcon,
  CalendarIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  CameraIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

const mainNavItems = [
  { icon: HomeIcon, label: 'Accueil', path: '/dashboard', emoji: '🏠' },
  { icon: SparklesIcon, label: 'Cultures', path: '/cultures', emoji: '🌱' },
  { icon: MapIcon, label: 'Parcelles', path: '/parcelles', emoji: '🗺️' },
  { icon: CheckCircleIcon, label: 'Tâches', path: '/taches', emoji: '✅' },
];

const moreNavItems = [
  { icon: BeakerIcon, label: 'Pépinière', path: '/pepiniere', emoji: '🌿' },
  { icon: CalendarIcon, label: 'Calendrier', path: '/calendrier', emoji: '📅' },
  { icon: ShoppingBagIcon, label: 'Récoltes', path: '/recoltes', emoji: '🥬' },
  { icon: ArchiveBoxIcon, label: 'Graines', path: '/graines', emoji: '🌾' },
  { icon: BuildingStorefrontIcon, label: 'Fournisseurs', path: '/fournisseurs', emoji: '🏪' },
  { icon: ChartBarIcon, label: 'Fiches techniques', path: '/fiches-techniques', emoji: '📋' },
  { icon: CameraIcon, label: 'Journal', path: '/journal', emoji: '📸' },
  { icon: ChartBarIcon, label: 'Analytique', path: '/analytique', emoji: '📊' },
  { icon: Cog6ToothIcon, label: 'Paramètres', path: '/parametres', emoji: '⚙️' },
];

export default function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  const handleMoreItemClick = (path) => {
    setSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Feuille coulissante "Plus" */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40" aria-modal="true" role="dialog" aria-label="Menu supplémentaire">
          {/* Fond obscurci */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          {/* Contenu de la feuille */}
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-xl pb-safe">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Plus d'options</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fermer le menu"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Navigation supplémentaire">
              <ul role="list" className="grid grid-cols-2 gap-1 p-3">
                {moreNavItems.map(({ icon: Icon, label, path, emoji }) => (
                  <li key={path}>
                    <button
                      onClick={() => handleMoreItemClick(path)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-left"
                      aria-label={label}
                    >
                      <span className="text-xl" aria-hidden="true">{emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Barre de navigation fixe en bas */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg"
        aria-label="Navigation principale mobile"
      >
        <ul role="list" className="flex items-stretch justify-around">
          {mainNavItems.map(({ icon: Icon, label, path, emoji }) => (
            <li key={path} className="flex-1">
              <NavLink
                to={path}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 py-2 w-full min-h-[56px] transition-colors',
                    isActive
                      ? 'text-[#1B5E20]'
                      : 'text-gray-500 hover:text-[#1B5E20]',
                  ].join(' ')
                }
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <span className="text-lg" aria-hidden="true">{emoji}</span>
                    <Icon
                      className={`h-5 w-5 ${isActive ? 'text-[#1B5E20]' : 'text-gray-400'}`}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-medium leading-none mt-0.5">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {/* Bouton "Plus" */}
          <li className="flex-1">
            <button
              onClick={() => setSheetOpen(true)}
              className={[
                'flex flex-col items-center justify-center gap-0.5 py-2 w-full min-h-[56px] transition-colors',
                sheetOpen ? 'text-[#1B5E20]' : 'text-gray-500 hover:text-[#1B5E20]',
              ].join(' ')}
              aria-label="Plus d'options de navigation"
              aria-expanded={sheetOpen}
            >
              <span className="text-lg" aria-hidden="true">⋯</span>
              <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-none mt-0.5">Plus</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
