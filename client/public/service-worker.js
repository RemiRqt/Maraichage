// ============================================================
// Service Worker — MalaMaraichageApp
// Cache shell de l'app + stratégie hors-ligne
// ============================================================

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Nettoyer les anciens caches
cleanupOutdatedCaches();

// Précacher les assets générés par Vite (injectés par vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || []);

// ---- Stratégies de cache ----

// API principale : Network First (données fraîches si possible, sinon cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24h
      }),
    ],
  })
);

// API Météo Open-Meteo : Network First avec fallback cache
registerRoute(
  ({ url }) => url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'weather-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 6, // 6h
      }),
    ],
  })
);

// Google Fonts : Cache First
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
      }),
    ],
  })
);

// Images uploadées : Stale While Revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new StaleWhileRevalidate({
    cacheName: 'uploads-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
      }),
    ],
  })
);

// ---- Événements du cycle de vie ----

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ---- Gestion des messages ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
