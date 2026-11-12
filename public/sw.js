// BUILD_ID e PRECACHE_ASSETS são preenchidos no build (plugin em vite.config.mjs).
// Em desenvolvimento ficam como estão e o service worker nem é registrado.
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `akkai-3d-shell-${BUILD_ID}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
const PRECACHE_ASSETS_RAW = '__PRECACHE_ASSETS__';
const PRECACHE_ASSETS = Array.isArray(PRECACHE_ASSETS_RAW)
  ? PRECACHE_ASSETS_RAW
  : [];
// Com sinal fraco a conexão pode ficar pendurada: passado esse tempo, abre o
// app pela cópia local em vez de deixar a tela em branco.
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(APP_SHELL);
      // Todos os chunks do build: sem isso, telas nunca abertas online não
      // carregariam sem internet. Uma falha isolada não invalida a instalação.
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset)),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  );
}

async function handleNavigation(event) {
  const cache = await caches.open(CACHE_NAME);
  const networkResponse = fetch(event.request).then((response) => {
    if (response.ok) {
      event.waitUntil(cache.put('/index.html', response.clone()));
    }
    return response;
  });
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(null), NAVIGATION_TIMEOUT_MS),
  );

  try {
    const response = await Promise.race([networkResponse, timeout]);

    if (response) {
      return response;
    }
  } catch {
    // Sem rede: cai na cópia local abaixo.
  }

  const cached = await cache.match('/index.html');

  return cached ?? networkResponse.catch(() => Response.error());
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Só arquivos estáticos do app passam pelo cache. Qualquer outra rota (como
  // uma API servida na mesma origem) segue direto para a rede, para nunca
  // entregar dados desatualizados como se fossem atuais.
  if (!isStaticAsset(url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        }),
    ),
  );
});
