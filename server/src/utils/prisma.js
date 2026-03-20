// ============================================================
// Instance Prisma partagée — singleton pour toute l'app
// ============================================================

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
    : ['warn', 'error'],
});

// Log des requêtes SQL en développement
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'SQL');
  });
}

module.exports = prisma;
