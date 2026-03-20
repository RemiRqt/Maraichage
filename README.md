# 🌿 MalaMaraichageApp

Application web de gestion de maraîchage heirloom pour une exploitation à Mormant (77720), Seine-et-Marne.

Gestion de la production maraîchère : cultures, planches, pépinière, calendrier, tâches, récoltes, graines, météo, journal de bord et analytique.

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Météo | Open-Meteo (gratuit, sans clé API) |
| Mode hors-ligne | Service Worker + IndexedDB |
| Export | ExcelJS (XLSX) + PDFKit (PDF) |

---

## Démarrage rapide (Docker)

### Prérequis
- Docker Desktop installé et lancé
- Git

### Installation

```bash
# 1. Copier le fichier de configuration
cp .env.example .env

# 2. Lancer l'application
docker-compose up -d

# 3. Vérifier que tout est lancé
docker-compose ps
```

L'application sera disponible sur :
- **Frontend** : http://localhost:5173
- **API** : http://localhost:3001/api/v1
- **Santé** : http://localhost:3001/health

### Comptes par défaut

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Maraîcher | maraicher@exploitation.fr | maraicher2025 |
| Responsable | responsable@exploitation.fr | responsable2025 |

**⚠️ Changez les mots de passe après la première connexion !**

---

## Installation manuelle (sans Docker)

### Prérequis
- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
# Installer les dépendances
cd server
npm install

# Configurer la base de données
cp ../.env.example .env
# Éditer .env avec vos informations de connexion PostgreSQL

# Migrations et seed
npx prisma migrate deploy
npx prisma db seed

# Lancer le serveur
npm run dev
```

### Frontend

```bash
cd client
npm install
# Créer .env.local avec VITE_API_URL=http://localhost:3001/api/v1
npm run dev
```

---

## Structure du projet

```
Maraichage/
├── docker-compose.yml          # Configuration Docker
├── Procfile                    # Configuration Heroku
├── .env.example                # Variables d'environnement à copier
│
├── server/                     # Backend Node.js / Express
│   ├── prisma/
│   │   ├── schema.prisma       # Schéma de base de données
│   │   └── seed.js             # Données initiales
│   ├── src/
│   │   ├── app.js              # Configuration Express
│   │   ├── server.js           # Point d'entrée
│   │   ├── routes/             # Routes API REST
│   │   ├── controllers/        # Logique métier
│   │   ├── middleware/         # Auth JWT, validation, upload
│   │   ├── services/           # Météo, PDF, Export
│   │   ├── jobs/               # CRON job météo
│   │   └── utils/              # Logger, Prisma client
│   └── uploads/                # Fichiers uploadés (photos, PDF)
│
└── client/                     # Frontend React
    ├── public/
    │   └── service-worker.js   # PWA offline support
    └── src/
        ├── components/         # Composants réutilisables
        ├── pages/              # Pages principales
        ├── context/            # React Context (auth, saison, offline)
        ├── services/           # API, IndexedDB
        └── styles/             # CSS global
```

---

## API REST

Toutes les routes (sauf `/auth/*`) nécessitent un header `Authorization: Bearer <token>`.

### Authentification
```
POST /api/v1/auth/login      — Connexion
POST /api/v1/auth/register   — Créer un compte
POST /api/v1/auth/refresh    — Rafraîchir le token
POST /api/v1/auth/logout     — Déconnexion
```

### Ressources principales
```
GET/POST   /api/v1/seasons
GET/POST   /api/v1/zones
GET/PUT    /api/v1/beds/:id
GET/POST   /api/v1/species
GET/POST   /api/v1/cultivars
GET/POST   /api/v1/culture-sheets
GET/POST   /api/v1/plantings
GET/POST   /api/v1/tasks
GET/POST   /api/v1/harvests
GET/POST   /api/v1/nursery
GET/POST   /api/v1/seeds
GET        /api/v1/weather
GET/POST   /api/v1/journal
POST       /api/v1/photos/upload
GET        /api/v1/analytics/dashboard
GET        /api/v1/export/:entity?format=csv|xlsx|pdf
POST       /api/v1/planning/assisted
```

---

## Déploiement Heroku (Phase 2)

### Prérequis
- CLI Heroku installé (`heroku` command)
- Compte Heroku avec carte bancaire (pour Heroku Postgres)

```bash
# Créer l'application Heroku
heroku create malamaraichage

# Ajouter PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# Configurer les variables d'environnement
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 64)
heroku config:set JWT_REFRESH_SECRET=$(openssl rand -base64 64)
heroku config:set CORS_ORIGIN=https://malamaraichage.herokuapp.com

# Déployer
git push heroku main

# Lancer le seed initial (une seule fois)
heroku run "cd server && npx prisma db seed"
```

### Build frontend pour production

Le frontend doit être buildé et servi par le serveur Node en production :

```bash
cd client && npm run build
# Copier dist/ dans server/public/
cp -r dist/* ../server/public/
```

Le serveur Express sert automatiquement les fichiers statiques depuis `server/public/`.

---

## Mode hors-ligne

L'application fonctionne sans réseau grâce au Service Worker et IndexedDB :

- **Lecture** : les données récentes sont mises en cache automatiquement
- **Écriture** : les actions (cocher une tâche, saisir une récolte, noter dans le journal) sont stockées localement
- **Synchronisation** : au retour du réseau, les données locales sont automatiquement envoyées au serveur
- **Indicateur** : badge orange "Hors-ligne" visible en cas de déconnexion, compteur de modifications en attente

---

## Données initiales

Au premier lancement, les données suivantes sont créées automatiquement :

- **3 zones** : Serre (14 planches), Zone Nord (25 planches), Zone Sud (10 planches) — 49 planches au total
- **38 espèces** couvrant les principales familles botaniques maraîchères
- **1 saison** : "Saison 2025" (01/01/2025 → 31/12/2025) — active
- **2 utilisateurs** : maraîcher et responsable

---

## Développement

### Lancer les tests
```bash
cd server && npm test
```

### Prisma Studio (interface visuelle BDD)
```bash
cd server && npm run prisma:studio
```

### Migrations de schéma
```bash
cd server
npx prisma migrate dev --name "description_de_la_migration"
```

---

## Maintenance

### Sauvegarder la base de données
```bash
docker exec malamaraichage_db pg_dump -U maraichage malamaraichage > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde
```bash
docker exec -i malamaraichage_db psql -U maraichage malamaraichage < backup_20250101.sql
```

---

## Aide

Pour toute modification de l'application, vous pouvez utiliser **Claude Code** qui comprend l'architecture de ce projet.

Exemples de demandes :
- *"Ajoute un champ 'variété parentale' dans la fiche cultivar"*
- *"Crée une alerte quand le stock de graines passe sous 10g"*
- *"Ajoute un graphique de comparaison des récoltes entre deux saisons"*
