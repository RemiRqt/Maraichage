// ============================================================
// Configuration Express — MalaMaraichageApp
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth');
const seasonRoutes = require('./routes/seasons');
const zoneRoutes = require('./routes/zones');
const bedRoutes = require('./routes/beds');
const speciesRoutes = require('./routes/species');
const cultivarRoutes = require('./routes/cultivars');
const cultureSheetRoutes = require('./routes/cultureSheets');
const taskTemplateRoutes = require('./routes/taskTemplates');
const plantingRoutes = require('./routes/plantings');
const taskRoutes = require('./routes/tasks');
const harvestRoutes = require('./routes/harvests');
const nurseryRoutes = require('./routes/nursery');
const seedRoutes = require('./routes/seeds');
const weatherRoutes = require('./routes/weather');
const journalRoutes = require('./routes/journal');
const photoRoutes = require('./routes/photos');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');
const planningRoutes = require('./routes/planning');
const syncRoutes = require('./routes/sync');
const settingsRoutes = require('./routes/settings');
const calendarRoutes = require('./routes/calendar');
const supplierRoutes = require('./routes/suppliers');
const invoiceRoutes = require('./routes/invoices');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();

// ---- Sécurité ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ---- CORS ----
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ---- Rate limiting global (désactivé en local) ----

// ---- Parsing du corps des requêtes ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- Logs HTTP ----
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ---- Servir les fichiers uploadés ----
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ---- Route de santé ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Routes API ----
const API_PREFIX = '/api/v1';

// Authentification (sans JWT obligatoire)
app.use(`${API_PREFIX}/auth`, authRoutes);

// Toutes les autres routes nécessitent un JWT valide
app.use(`${API_PREFIX}/seasons`, seasonRoutes);
app.use(`${API_PREFIX}/zones`, zoneRoutes);
app.use(`${API_PREFIX}/beds`, bedRoutes);
app.use(`${API_PREFIX}/species`, speciesRoutes);
app.use(`${API_PREFIX}/cultivars`, cultivarRoutes);
app.use(`${API_PREFIX}/culture-sheets`, cultureSheetRoutes);
app.use(`${API_PREFIX}/task-templates`, taskTemplateRoutes);
app.use(`${API_PREFIX}/plantings`, plantingRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/harvests`, harvestRoutes);
app.use(`${API_PREFIX}/nursery`, nurseryRoutes);
app.use(`${API_PREFIX}/seeds`, seedRoutes);
app.use(`${API_PREFIX}/weather`, weatherRoutes);
app.use(`${API_PREFIX}/journal`, journalRoutes);
app.use(`${API_PREFIX}/photos`, photoRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/export`, exportRoutes);
app.use(`${API_PREFIX}/planning`, planningRoutes);
app.use(`${API_PREFIX}/sync`, syncRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/calendar`, calendarRoutes);
app.use(`${API_PREFIX}/suppliers`, supplierRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);

// ---- Gestion des erreurs 404 ----
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ---- Middleware de gestion d'erreurs centralisé ----
app.use(errorHandler);

module.exports = app;
