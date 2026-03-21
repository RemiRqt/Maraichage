import { NavLink } from 'react-router-dom';

const navItems = [
  { emoji: '🏠', label: 'Accueil', path: '/dashboard' },
  { emoji: '🗺️', label: 'Parcelles', path: '/parcelles' },
  { emoji: '✅', label: 'Tâches', path: '/taches' },
  { emoji: '🥬', label: 'Récoltes', path: '/recoltes' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg safe-area-bottom"
      aria-label="Navigation principale mobile"
    >
      <ul role="list" className="flex items-stretch justify-around">
        {navItems.map(({ label, path, emoji }) => (
          <li key={path} className="flex-1">
            <NavLink
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 w-full min-h-[52px] transition-colors ${
                  isActive ? 'text-[#1B5E20]' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-xl ${isActive ? '' : 'opacity-70'}`} aria-hidden="true">{emoji}</span>
                  <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-[#1B5E20]' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
