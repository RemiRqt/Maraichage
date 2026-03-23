Fais un audit complet de l'application MalaMaraichage.

Utilise un agent Explore pour vérifier chaque page dans `client/src/pages/` et chaque composant dans `client/src/components/`. Pour chaque fichier vérifie :

1. **Responsive** : overflow de tables sans wrapper, texte coupé sur mobile, grilles qui débordent
2. **Formulaires** : champs requis validés, handlers d'erreur avec toast, loading states sur les boutons
3. **Données** : appels API avec try/catch, états vides avec emoji, loading spinners
4. **Cohérence UI** : boutons uniformes (btn-primary/secondary/ghost), icônes p-1.5 h-4 w-4, couleurs delete en text-red-500
5. **Accessibilité** : aria-hidden sur emojis décoratifs, labels sur inputs, aria-label sur boutons icônes
6. **Patterns cassés** : URLs hardcodées (localhost), window.location.reload(), imports inutilisés

Présente le résultat dans un tableau par page avec sévérité (Critique/Moyen/Mineur) et propose les corrections.

Ne fais PAS les corrections — présente seulement le rapport pour validation.
