Fais une passe d'optimisation sur l'application MalaMaraichage.

Vérifie et optimise :

1. **Bundle size** : vérifie `npx vite build` output, identifie les chunks trop gros, propose du lazy loading pour les pages lourdes (Chart.js, PDF)
2. **Requêtes API** : cherche les requêtes N+1 dans les controllers backend, les fetches dupliqués dans le frontend, les données chargées mais jamais utilisées
3. **Performance frontend** : composants qui re-render inutilement (manque de useMemo/useCallback), listes longues sans virtualisation
4. **Cache** : headers Cache-Control manquants sur les assets statiques, stratégies Workbox à améliorer
5. **Images/assets** : fichiers lourds dans public/, SVG non optimisés
6. **Base de données** : index manquants sur les colonnes utilisées dans les WHERE/ORDER BY fréquents

Présente un rapport avec impact estimé (Haut/Moyen/Bas) et demande confirmation avant d'appliquer les optimisations.
