// Service Worker - Solo para notificaciones push
// NO cachea archivos para evitar problemas de actualización

const CACHE_NAME = 'innovar-cocinas-v10';

// Instalación del service worker - NO cachear nada
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalado - Sin caché de archivos');
  self.skipWaiting();
});

// Activación - Limpiar TODOS los caches anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Eliminando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - NO interceptar, dejar que el navegador maneje todo normalmente
self.addEventListener('fetch', (event) => {
  // No hacer nada - dejar que el navegador maneje las requests normalmente
  return;
});

// ============ NOTIFICACIONES PUSH ============

// Recibir notificación push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recibido');
  
  let data = {
    title: 'INNOVAR Cocinas',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'default',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificación clickeada');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificación cerrada');
});

// Sincronización en segundo plano (para notificaciones pendientes)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('[Service Worker] Sincronizando notificaciones');
  }
});
