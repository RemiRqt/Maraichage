// ============================================================
// Service IndexedDB — Stockage local pour mode hors-ligne
// ============================================================

import { openDB } from 'idb';

const DB_NAME = 'malamaraichage';
const DB_VERSION = 1;

// Ouvre (ou crée) la base IndexedDB
const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // File d'attente des opérations hors-ligne
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const queueStore = db.createObjectStore('offlineQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        queueStore.createIndex('timestamp', 'timestamp');
      }

      // Cache des tâches d'aujourd'hui
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }

      // Cache des récoltes
      if (!db.objectStoreNames.contains('harvests')) {
        db.createObjectStore('harvests', { keyPath: 'id' });
      }

      // Cache du journal
      if (!db.objectStoreNames.contains('journalEntries')) {
        db.createObjectStore('journalEntries', { keyPath: 'id' });
      }

      // Lots pépinière
      if (!db.objectStoreNames.contains('nurseryBatches')) {
        db.createObjectStore('nurseryBatches', { keyPath: 'id' });
      }
    },
  });

// ---- File d'attente hors-ligne ----

/**
 * Ajoute une opération à la file d'attente hors-ligne
 * @param {string} method - HTTP method (POST, PUT, PATCH, DELETE)
 * @param {string} url - URL de l'endpoint
 * @param {object} data - Corps de la requête
 */
export const queueOfflineOperation = async (method, url, data) => {
  const db = await getDb();
  await db.add('offlineQueue', {
    method,
    url,
    data,
    timestamp: new Date().toISOString(),
    synced: false,
  });
};

/**
 * Récupère toutes les opérations en attente
 */
export const getPendingOperations = async () => {
  const db = await getDb();
  return db.getAll('offlineQueue');
};

/**
 * Supprime une opération de la file après synchronisation réussie
 */
export const removeQueuedOperation = async (id) => {
  const db = await getDb();
  await db.delete('offlineQueue', id);
};

/**
 * Nombre d'opérations en attente
 */
export const getPendingCount = async () => {
  const db = await getDb();
  return db.count('offlineQueue');
};

// ---- Cache local ----

/**
 * Sauvegarde des données dans le cache local
 */
export const cacheData = async (storeName, items) => {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
};

/**
 * Récupère toutes les données du cache local
 */
export const getCachedData = async (storeName) => {
  const db = await getDb();
  return db.getAll(storeName);
};

/**
 * Récupère un élément par ID
 */
export const getCachedItem = async (storeName, id) => {
  const db = await getDb();
  return db.get(storeName, id);
};

/**
 * Vide le cache d'un store
 */
export const clearCache = async (storeName) => {
  const db = await getDb();
  await db.clear(storeName);
};
