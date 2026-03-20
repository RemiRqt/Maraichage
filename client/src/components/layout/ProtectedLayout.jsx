import { Outlet } from 'react-router-dom';
import { useOffline } from '../../context/OfflineContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function ProtectedLayout() {
  const { isOnline, pendingCount } = useOffline();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        {!isOnline && (
          <div className="offline-badge flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium" role="alert">
            <span>📡</span>
            <span>Mode hors ligne — certaines fonctionnalités sont limitées</span>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-50 text-yellow-800 border-b border-yellow-200" role="status">
            <span>{pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente de synchronisation</span>
          </div>
        )}

        <main className="flex-1 overflow-auto pb-20 md:pb-0" id="main-content">
          <Outlet />
        </main>
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
