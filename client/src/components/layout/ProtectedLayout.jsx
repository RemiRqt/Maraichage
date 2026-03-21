import { Outlet } from 'react-router-dom';
import { useOffline } from '../../context/OfflineContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';

export default function ProtectedLayout() {
  const { isOnline, pendingCount } = useOffline();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 h-screen md:h-auto">
        {/* Header mobile avec burger — fixed pour rester visible au scroll */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30">
          <MobileHeader />
        </div>

        {/* Spacer pour compenser le header fixe sur mobile */}
        <div className="md:hidden h-[44px] flex-shrink-0" />

        {!isOnline && (
          <div className="offline-badge flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium" role="alert">
            <span>📡</span>
            <span>Mode hors ligne</span>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-50 text-yellow-800 border-b border-yellow-200" role="status">
            <span>{pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente</span>
          </div>
        )}

        <main className="flex-1 pb-16 md:pb-0" id="main-content">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
