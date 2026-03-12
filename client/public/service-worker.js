// Service Worker para INNOVAR Cocinas - Soporte Offline
const CACHE_NAME = 'innovar-v1';
const OFFLINE_URL = '/offline.html';

const CACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico',
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Cacheando recursos');
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de caché: Network First, Fall back to Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes no-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar solicitudes a dominios externos (excepto APIs críticas)
  if (url.origin !== self.location.origin) {
    // Permitir APIs de Manus
    if (!url.hostname.includes('api.manus.im')) {
      return;
    }
  }

  // Estrategia: Network First para APIs, Cache First para assets
  if (url.pathname.includes('/api/')) {
    // Network First para APIs
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuestas exitosas
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar cache
          return caches.match(request).then((response) => {
            if (response) {
              return response;
            }
            // Si no hay cache, retornar página offline
            return caches.match(OFFLINE_URL);
          });
        })
    );
  } else {
    // Cache First para assets
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(request).then((response) => {
          // No cachear respuestas no-ok
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cachear respuesta exitosa
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  }
});

// Sincronización en background
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sincronización en background:', event.tag);

  if (event.tag === 'sync-projects') {
    event.waitUntil(syncProjects());
  } else if (event.tag === 'sync-quotations') {
    event.waitUntil(syncQuotations());
  }
});

async function syncProjects() {
  try {
    console.log('[ServiceWorker] Sincronizando proyectos...');
    // Aquí iría la lógica de sincronización
    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Error en sincronización:', error);
    return Promise.reject(error);
  }
}

async function syncQuotations() {
  try {
    console.log('[ServiceWorker] Sincronizando cotizaciones...');
    // Aquí iría la lógica de sincronización
    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Error en sincronización:', error);
    return Promise.reject(error);
  }
}

// Notificaciones push
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push recibido:', event);

  const options = {
    body: event.data ? event.data.text() : 'Notificación de INNOVAR',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'innovar-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('INNOVAR Cocinas', options)
  );
});

// Clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notificación clickeada');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
