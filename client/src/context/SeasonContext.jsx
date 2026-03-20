// ============================================================
// Contexte Saison — saison active globale de l'application
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SeasonContext = createContext(null);

export const SeasonProvider = ({ children }) => {
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(false);

  // Charger les saisons au démarrage
  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/seasons');
      const data = response.data;
      setSeasons(data);
      // Définir la saison active
      const active = data.find((s) => s.isActive);
      if (active) setActiveSeason(active);
    } catch (err) {
      console.error('Impossible de charger les saisons', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Changer la saison sélectionnée (sans modifier le serveur)
   * Utile pour consulter des données d'une saison passée
   */
  const selectSeason = useCallback((season) => {
    setActiveSeason(season);
  }, []);

  /**
   * Activer une saison (modifie le serveur)
   */
  const activateSeason = useCallback(async (seasonId) => {
    await api.post(`/seasons/${seasonId}/activate`);
    await loadSeasons();
  }, [loadSeasons]);

  return (
    <SeasonContext.Provider
      value={{ activeSeason, seasons, loading, selectSeason, activateSeason, loadSeasons }}
    >
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error('useSeason doit être utilisé dans un SeasonProvider');
  }
  return context;
};

export default SeasonContext;
