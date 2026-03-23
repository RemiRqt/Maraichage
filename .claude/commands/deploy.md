Build le frontend, commit toutes les modifications et push sur Railway.

Instructions :
1. Lance `cd client && npx vite build` pour builder le frontend
2. Si le build échoue, corrige les erreurs et rebuild
3. Fais un `git status` pour voir les fichiers modifiés
4. Stage tous les fichiers source modifiés (PAS les fichiers dans dist/ ni .env)
5. Crée un commit avec un message descriptif en anglais résumant les changements
6. Push sur `origin main`
7. Confirme le déploiement à l'utilisateur

Le message de commit doit suivre le format :
```
Description courte des changements

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```
