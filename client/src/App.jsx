// ============================================================
// Composant racine — Router et providers globaux
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Providers
import { AuthProvider } from './context/AuthContext';
import { SeasonProvider } from './context/SeasonContext';
import { OfflineProvider } from './context/OfflineContext';

// Layouts
import ProtectedLayout from './components/layout/ProtectedLayout';

// Pages
import DashboardPage from './pages/DashboardPage';
import CulturesPage from './pages/CulturesPage';
import BedsPage from './pages/BedsPage';
import NurseryPage from './pages/NurseryPage';
import CalendarPage from './pages/CalendarPage';
import TasksPage from './pages/TasksPage';
import HarvestsPage from './pages/HarvestsPage';
import SeedsPage from './pages/SeedsPage';
import JournalPage from './pages/JournalPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
// import WeatherPage from './pages/WeatherPage';
import BedDetailPage from './pages/BedDetailPage';
import PlantingDetailPage from './pages/PlantingDetailPage';
import PlanningPage from './pages/PlanningPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import ChartsPage from './pages/ChartsPage';
import LateTasksPage from './pages/LateTasksPage';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
      <OfflineProvider>
        <SeasonProvider>
            {/* Notifications toast */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.875rem',
                },
                success: {
                  iconTheme: { primary: '#1B5E20', secondary: '#FFFFFF' },
                },
              }}
            />

            <Routes>

              {/* Routes protégées (JWT obligatoire) */}
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/cultures" element={<CulturesPage />} />
                <Route path="/parcelles" element={<BedsPage />} />
                <Route path="/parcelles/:bedId" element={<BedDetailPage />} />
                <Route path="/pepiniere" element={<NurseryPage />} />
                <Route path="/calendrier" element={<CalendarPage />} />
                <Route path="/taches" element={<TasksPage />} />
                <Route path="/taches/retard" element={<LateTasksPage />} />
                <Route path="/recoltes" element={<HarvestsPage />} />
                <Route path="/graines" element={<SeedsPage />} />
                <Route path="/journal" element={<JournalPage />} />
                <Route path="/analytique" element={<AnalyticsPage />} />
                <Route path="/planification" element={<PlanningPage />} />
                <Route path="/fiches-techniques" element={<ChartsPage />} />
                <Route path="/plantations/:plantingId" element={<PlantingDetailPage />} />
                <Route path="/parametres" element={<SettingsPage />} />
                <Route path="/fournisseurs" element={<SuppliersPage />} />
                <Route path="/fournisseurs/:supplierId" element={<SupplierDetailPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </SeasonProvider>
      </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
