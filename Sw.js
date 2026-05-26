/**
 * sw.js — Service Worker
 * Himnario Digital IDS Lanín
 *
 * Estrategia de caché:
 * - Shell de la app (HTML, CSS, JS, íconos): Cache First
 * - Datos (canciones.json): Stale-While-Revalidate
 * - Fuentes externas: Cache First con expiración
 *
 * Versión: incrementar CACHE_VERSION para forzar actualización.
 */

'use strict';

// =============================================================================
// 1. CONFIGURACIÓN
// =============================================================================

const CACHE_VERSION   = 'v1.0.0';
const CACHE_SHELL     = `himnario-shell-${CACHE_VERSION}`;
const CACHE_DATA      = `himnario-data-${CACHE_VERSION}`;
const CACHE_FONTS     = `himnario-fonts-${CACHE_VERSION}`;

/** Recursos del App Shell — se cachean en la instalación */
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/navbar.css',
  './css/cards.css',
  './css/modal.css',
  './css/animations.css',
  './js/app.js',
  './js/search.js',
  './js/storage.js',
  './js/renderer.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-144.png',
];

/** Recursos de datos — se cachean con Stale-While-Revalidate */
const DATA_ASSETS = [
  './data/canciones.json',
];

/** Dominios de fuentes externas */
const FONT_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// =============================================================================
// 2. INSTALACIÓN — Pre-cachear el App Shell
// =============================================================================

self.addEventListener('install', (event) => {
  console.log(`[SW] Instalando ${CACHE_VERSION}…`);

  event.waitUntil(
    (async () => {
      // Cachear shell de la app
      const shellCache = await caches.open(CACHE_SHELL);
      await shellCache.addAll(SHELL_ASSETS).catch(err => {
        console.warn('[SW] Algunos assets del shell no se pudieron cachear:', err);
      });

      // Cachear datos
      const dataCache = await caches.open(CACHE_DATA);
      await dataCache.addAll(DATA_ASSETS).catch(err => {
        console.warn('[SW] No se pudo cachear canciones.json:', err);
      });

      // Activar inmediatamente sin esperar a que se cierre la pestaña
      await self.skipWaiting();
      console.log('[SW] Instalación completa.');
    })()
  );
});

// =============================================================================
// 3. ACTIVACIÓN — Limpiar cachés antiguas
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activando ${CACHE_VERSION}…`);

  event.waitUntil(
    (async () => {
      // Eliminar cachés de versiones anteriores
      const cacheNames = await caches.keys();
      const deletions = cacheNames
        .filter(name =>
          name.startsWith('himnario-') &&
          name !== CACHE_SHELL &&
          name !== CACHE_DATA &&
          name !== CACHE_FONTS
        )
        .map(name => {
          console.log(`[SW] Eliminando caché obsoleta: ${name}`);
          return caches.delete(name);
        });

      await Promise.all(deletions);

      // Tomar control de todas las pestañas abiertas
      await self.clients.claim();
      console.log('[SW] Activación completa. Controlando clientes.');
    })()
  );
});

// =============================================================================
// 4. FETCH — Interceptar peticiones de red
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') return;

  // Ignorar peticiones de extensiones del navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // Estrategia según el tipo de recurso
  if (isShellAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_SHELL));
  } else if (isDataAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DATA));
  } else if (isFontAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_FONTS));
  } else {
    // Para otros recursos: Network First con fallback a caché
    event.respondWith(networkFirst(request, CACHE_SHELL));
  }
});

// =============================================================================
// 5. ESTRATEGIAS DE CACHÉ
// =============================================================================

/**
 * Cache First: sirve desde caché; si no existe, va a la red y guarda.
 * Ideal para: assets estáticos (CSS, JS, íconos, fuentes).
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin red y sin caché: retornar página offline si es HTML
    if (request.headers.get('Accept')?.includes('text/html')) {
      return offlineFallback();
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate: sirve desde caché inmediatamente,
 * actualiza en background. Ideal para: datos (canciones.json).
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Actualizar en background (sin await)
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Retornar caché si existe, sino esperar la red
  return cached || networkPromise || offlineFallback();
}

/**
 * Network First: intenta la red; si falla, usa caché.
 * Ideal para: páginas HTML dinámicas.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.headers.get('Accept')?.includes('text/html')) {
      return offlineFallback();
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// =============================================================================
// 6. PÁGINA OFFLINE DE FALLBACK
// =============================================================================

/**
 * Retorna una respuesta HTML mínima cuando no hay red ni caché.
 */
function offlineFallback() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <title>Sin conexión — Himnario IDS Lanín</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000;
      color: #f0f0f0;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
      gap: 1.5rem;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: rgba(157,78,223,0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(157,78,223,0.4);
    }
    .icon svg { width: 40px; height: 40px; color: #9d4edf; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #f0f0f0; }
    p { font-size: 0.9rem; color: #a0a0a0; max-width: 280px; line-height: 1.6; }
    button {
      padding: 0.75rem 2rem;
      border-radius: 9999px;
      background: #9d4edf;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    button:hover { background: #b87aed; }
  </style>
</head>
<body>
  <div class="icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
      <path d="M3.6 9h16.8M3.6 15h16.8"/>
      <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>
    </svg>
  </div>
  <h1>Sin conexión</h1>
  <p>No hay conexión a internet. Los himnos que ya visitaste están disponibles offline.</p>
  <button onclick="window.location.reload()">Reintentar</button>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// =============================================================================
// 7. CLASIFICADORES DE RECURSOS
// =============================================================================

function isShellAsset(url) {
  const shellPaths = [
    '/index.html', '/manifest.json',
    '/css/', '/js/', '/icons/',
  ];
  return (
    url.origin === self.location.origin &&
    (url.pathname === '/' ||
     shellPaths.some(p => url.pathname.includes(p)))
  );
}

function isDataAsset(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.includes('/data/')
  );
}

function isFontAsset(url) {
  return FONT_DOMAINS.some(domain => url.hostname.includes(domain));
}

// =============================================================================
// 8. MENSAJES DESDE LA APP
// =============================================================================

self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      // Permite cachear URLs adicionales desde la app
      if (Array.isArray(event.data.urls)) {
        caches.open(CACHE_DATA).then(cache => {
          cache.addAll(event.data.urls).catch(console.warn);
        });
      }
      break;

    case 'GET_VERSION':
      event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
      break;
  }
});
