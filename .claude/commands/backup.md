Exporte les données critiques de l'application en JSON.

Instructions :
1. Connecte-toi à la base via l'API (pas directement Prisma, car la DB peut être distante)
2. Exporte chaque entité via les endpoints GET existants :
   - `/api/v1/seeds` → graines
   - `/api/v1/plantings?season_id=<active>` → plantations
   - `/api/v1/harvests?season_id=<active>` → récoltes
   - `/api/v1/suppliers` → fournisseurs
   - `/api/v1/culture-sheets` → fiches techniques
   - `/api/v1/nursery?season_id=<active>` → lots pépinière
3. Sauvegarde chaque export dans `backups/YYYY-MM-DD/` en fichiers JSON
4. Affiche un résumé du nombre d'enregistrements exportés par entité

Utilise l'URL de l'API de production : `https://malamaraichage-production.up.railway.app/api/v1`
