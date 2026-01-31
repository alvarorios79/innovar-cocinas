// Service Worker - Notificaciones push persistentes
// Versión mejorada para mantener notificaciones activas incluso sin sesión

const SW_VERSION = 'v11-persistent';

// Instalación del service worker
self.addEventListener('install', (event) => {
  console.log('[SW ' + SW_VERSION + '] Instalando...');
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// Activación - Tomar control inmediatamente
self.addEventListener('activate', (event) => {
  console.log('[SW ' + SW_VERSION + '] Activado');
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Eliminando cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Tomar control de todas las pestañas inmediatamente
      self.clients.claim()
    ])
  );
});

// Fetch - No interceptar, dejar que el navegador maneje todo
self.addEventListener('fetch', (event) => {
  return;
});

// ============ NOTIFICACIONES PUSH ============

// Recibir notificación push - Funciona incluso sin sesión activa
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');
  
  let data = {
    title: 'INNOVAR Cocinas',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default-' + Date.now(),
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
      // Asegurar tag único para evitar reemplazo de notificaciones
      if (!payload.tag) {
        data.tag = data.tag + '-' + Date.now();
      }
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag,
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200, 100, 200], // Vibración más notable
    requireInteraction: true, // Mantener notificación visible hasta que el usuario interactúe
    renotify: true, // Notificar aunque tenga el mismo tag
    silent: false,
    actions: data.actions || [
      { action: 'open', title: 'Ver' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event.action);
  
  event.notification.close();

  // Si el usuario hizo click en "Cerrar", no hacer nada más
  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta de la app
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Navegar a la URL y enfocar
            return client.navigate(urlToOpen).then(() => client.focus());
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada');
});

// ============ SINCRONIZACIÓN EN SEGUNDO PLANO ============

// Mantener el service worker activo periódicamente
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === 'keep-alive') {
    event.waitUntil(
      // Simplemente confirmar que el SW está activo
      Promise.resolve(console.log('[SW] Keep-alive sync ejecutado'))
    );
  }
});

// Periodic Background Sync (si está disponible)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      // El SW se mantiene activo para recibir push
      Promise.resolve(console.log('[SW] Periodic check ejecutado'))
    );
  }
});

// Mensaje desde la página principal
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Responder para confirmar que el SW está activo
    event.ports[0]?.postMessage({ status: 'alive', version: SW_VERSION });
  }
});

console.log('[SW ' + SW_VERSION + '] Script cargado');
