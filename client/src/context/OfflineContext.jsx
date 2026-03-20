// ============================================================
// Contexte Mode Hors-ligne — détection réseau + synchro
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPendingCount, getPendingOperations, removeQueuedOperation } from '../services/indexedDB';
import api from '../services/api';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Lancer la sync automatiquement
      syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Charger le nombre d'opérations en attente
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  /**
   * Synchronise les opérations en attente avec le serveur
   */
  const syncPendingOperations = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    const pending = await getPendingOperations();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;

    for (const operation of pending) {
      try {
        await api({
          method: operation.method,
          url: operation.url,
          data: operation.data,
        });
        await removeQueuedOperation(operation.id);
        syncedCount++;
      } catch (err) {
        // Continuer avec la prochaine opération en cas d'erreur
        console.warn('Erreur synchro:', err.message);
      }
    }

    setIsSyncing(false);
    await updatePendingCount();

    if (syncedCount > 0) {
      console.log(`✅ ${syncedCount} opération(s) synchronisée(s)`);
    }
  }, [isSyncing, updatePendingCount]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        syncPendingOperations,
        updatePendingCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline doit être utilisé dans un OfflineProvider');
  }
  return context;
};

export default OfflineContext;
