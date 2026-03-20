# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MalaMaraichageApp** — Full-stack web app for managing heirloom market gardening (maraîchage) operations at Mormant (77720), France. Tracks production, planning, harvests, seed inventory, weather, and operations logs for an internal catering service. UI and API messages are in French.

## Commands

### Backend (`server/`)
```bash
npm run dev              # Start with nodemon (port 3001)
npm test                 # Run Jest tests
npm run test:watch       # Watch mode for tests
npx jest path/to/test    # Run a single test file
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Create a new migration
npm run prisma:deploy    # Apply migrations (production/CI)
npm run prisma:seed      # Seed database (2 users, 3 zones, 49 beds, 38 species, 35 cultivars)
npm run prisma:studio    # Open visual database editor
```

### Data import scripts (`server/prisma/`)
```bash
node prisma/seedCultureSheets.js   # Import culture charts from csv/ (pépinière, transplants, rendements, semis directs, tâches)
node prisma/seedPlantations.js     # Import plantations from csv/Plantation-nocode.csv + create 2025 fictive season
node prisma/deduplicateCultivars.js # Merge duplicate cultivars (keeps seed inventory links)
```

### Frontend (`client/`)
```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build → dist/
npm run lint             # ESLint check
```

### Docker (root)
```bash
docker-compose up -d     # Start all services (Postgres, server, client)
docker-compose ps        # Check container status
```

## Architecture

### Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6 + Axios + Chart.js + PWA (vite-plugin-pwa)
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod via Docker & Heroku)
- **Auth**: JWT access token (15m) + refresh token (7d) via `jsonwebtoken` + `bcryptjs`
- **Offline**: IndexedDB (idb) + Workbox service worker — last-write-wins sync strategy
- **Exports**: ExcelJS (XLSX), PDFKit (PDF), CSV
- **Weather**: Open-Meteo API (free, no key) — daily CRON fetch via `node-cron`
- **Runtime**: Node.js 20 (alpine in Docker)

### Backend structure (`server/src/`)
- `app.js` — Express config, middleware registration, route mounting
- `server.js` — Entry point with graceful shutdown
- `routes/` + `controllers/` — 24 REST endpoint groups under `/api/v1`
- `middleware/` — auth, error handling, validation, file uploads (multer)
- `services/` — weather API, PDF generation, XLSX export, offline sync
- `jobs/` — CRON job for daily weather data fetch
- `utils/` — pino logger, Prisma client singleton

### Frontend structure (`client/src/`)
- `App.jsx` — React Router setup + context providers
- `pages/` — 18 pages (dashboard, cultures, parcelles, pepiniere, calendrier, taches, recoltes, graines, fiches-techniques, journal, analytique, meteo, planification, parametres, fournisseurs, fournisseur-detail, planting-detail, login)
- `context/` — `AuthContext`, `SeasonContext`, `OfflineContext`
- `services/` — Axios API client, IndexedDB helpers
- `components/` — Organized by concern: `forms/`, `ui/` (LoadingSpinner, Modal, StatusBadge…), `layout/` (ProtectedLayout, Sidebar, BottomNav), `weather/`
- `utils/speciesIcons.js` — Emoji mapping for 200+ species (used across all pages)

### Sidebar sections
Navigation is organized into logical sections: Production (Cultures, Parcelles, Pépinière, Graines), Planification (Calendrier, Tâches, Récoltes), Référentiel (Fiches techniques, Fournisseurs), Suivi (Journal, Analytique, Météo).

### Database (Prisma schema — 27 models)

**Core**: `User`, `RefreshToken`, `Season`, `Zone` (3), `Bed` (49 planches), `Species` (@unique name, category: LEGUME|AROMATIQUE|FRUIT|FLEUR), `Cultivar`

**Culture Sheets (hub + sub-charts linked to Species)**:
- `CultureSheet` — hub, one per species via `speciesId @unique`, computed `sowingMethod` (PEPINIERE|SEMIS_DIRECT|LES_DEUX)
- `NurseryChart` — container type, seeds/cell, germination days/temp, technique
- `NurseryRepotStage` — up to 3 repotting stages per nursery chart
- `TransplantChart` — row count, spacings, nurseryDurationDays, daysToMaturity, harvestWindowDays, plantsPerM2
- `DirectSowChart` — row count, spacing, daysToMaturity, harvestWindowDays, sow weeks
- `YieldChart` — sale unit, price, yieldKgPer30m, revenuePer30m, harvestsPerWeek
- `TaskTemplate` — name, direction (AVANT|APRES), daysOffset from implantation, minutesPerM2

**Operations**: `Planting` (PLANIFIE→TERMINE status machine, quantityPlanted as Decimal for m² portions), `Task` (A_FAIRE→FAIT, linked to TaskTemplate), `Harvest`, `NurseryBatch`

**Inventory**: `Supplier`, `Invoice`, `InvoiceLine`, `SeedInventory` (initialQuantity + quantityInStock as Int = seed count, not grams)

**Other**: `WeatherData`, `JournalEntry`, `Photo`, `AppSetting`

### Key data flows

**Task completion cascade**: When a task is completed (`PATCH /tasks/:id/complete`), the controller checks the template name and updates the planting accordingly:
- "Semis pépinière" → sets `sowingDate`, recalculates `transplantDate` and `expectedHarvestDate`
- "Transplantation" → sets `transplantDate`, recalculates `expectedHarvestDate`
- "1ère Récolte" → sets `actualFirstHarvestDate`, status → EN_RECOLTE
- All remaining tasks of the same planting are rescheduled based on new dates

**Beds with multiple plantings**: A bed can have multiple plantings (portions). The API returns `activePlantings[]` array per bed. Frontend renders proportional strips based on `quantityPlanted` (m²) vs `bed.areaM2`.

**Harvest forecast**: Calculated client-side from `expectedHarvestDate` + `harvestWindowDays` (from charts) + `expectedYieldKg`. Distributes yield across harvest window weeks.

### API conventions
- Base URL: `/api/v1`
- Auth header: `Authorization: Bearer <token>` (all routes except `/auth/*`)
- Dev proxy: Vite proxies `/api` → `localhost:3001`
- Tasks support `date_from` / `date_to` range filters
- Beds return `activePlantings[]` when `season_id` is provided

## Environment Setup

Copy `.env.example` to `.env` (server) and `.env.local` (client, Vite convention). Key variables:
```
DATABASE_URL          # SQLite: file:./dev.db | Postgres: postgresql://...
JWT_SECRET            # Random secret for access tokens
JWT_REFRESH_SECRET    # Separate secret for refresh tokens
VITE_API_URL          # http://localhost:3001/api/v1 (dev)
CORS_ORIGIN           # http://localhost:5173 (dev)
```

### Seed data credentials
After `npm run prisma:seed`, two users are available:
- `maraicher@exploitation.fr` / `maraicher2025` (role: MARAICHER)
- `responsable@exploitation.fr` / `responsable2025` (role: RESPONSABLE)

## CSV Data (`csv/`)

Source data from Airtable exports used by import scripts:
- `Charte pépinière-Grid view.csv` — 136 nursery entries
- `Charte transplants-Grid view.csv` — 128 transplant entries
- `Charte des rendements-Grid view.csv` — 189 yield entries
- `Charte semis directs-Grid view.csv` — 36 direct sow entries
- `Charte taches-Nocode.csv` — 374 task template entries
- `Plantation-nocode.csv` — 23 plantations for 2026 season

## Known TODOs Before Production

**Auth frontend is not wired up**:
- `AuthContext` uses a hardcoded fake user — no real login/logout flow
- `LoginPage` exists but is not in the router
- `ProtectedLayout` does not verify JWT tokens
- Server auth middleware (`middleware/auth.js`) currently bypasses token validation (SYSTEM_USER)

This must be implemented before Heroku deployment.

## Deployment (Heroku)

```bash
# Procfile: runs migrations then starts server
cd server && npx prisma migrate deploy && node src/server.js
```
Production requires: `heroku-postgresql:essential-0` addon, `NODE_ENV=production`, `CORS_ORIGIN=https://malamaraichage.herokuapp.com`.
