Vérifie la compatibilité mobile de toutes les pages de l'application.

Pour chaque page dans `client/src/pages/`, vérifie :

1. **Tables** : sont-elles wrappées dans `overflow-x-auto` ? Ont-elles trop de colonnes pour mobile ?
2. **Texte** : y a-t-il des `truncate` manquants sur les noms longs ? Les tailles de texte utilisent-elles des breakpoints `text-xs sm:text-sm` ?
3. **Grilles** : les grids passent-elles en `grid-cols-1` sur mobile ?
4. **Boutons** : les touch targets font-ils au moins 44px ? Les boutons ont-ils assez de padding ?
5. **Modals** : sont-ils scrollables sur petit écran ? Le contenu ne déborde-t-il pas ?
6. **Formulaires** : les inputs sont-ils en pleine largeur sur mobile ? Les grids de formulaire s'empilent-elles ?
7. **Navigation** : le header fixe ne cache-t-il pas le contenu ? Le bottom nav ne cache-t-il pas le dernier élément ?

Présente les problèmes trouvés et corrige-les directement.
