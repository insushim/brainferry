const CACHE_VERSION = 'brainferry-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const CACHE_FIRST_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot',
  '.css', '.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

function isCacheFirstRequest(url) {
  return CACHE_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (isNavigationRequest(request)) {
      const offlinePage = await caches.match('/');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BrainFerry - Offline</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0F172A;color:#E2E8F0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}.container{max-width:400px}h1{font-size:2rem;margin-bottom:1rem;background:linear-gradient(135deg,#3B82F6,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{color:#94A3B8;line-height:1.6;margin-bottom:1.5rem}button{background:#3B82F6;color:white;border:none;padding:0.75rem 2rem;border-radius:0.5rem;font-size:1rem;cursor:pointer}button:hover{background:#2563EB}</style></head><body><div class="container"><h1>BrainFerry</h1><p>인터넷 연결이 끊겼습니다.<br>연결을 확인하고 다시 시도해주세요.</p><button onclick="location.reload()">다시 시도</button></div></body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== location.origin) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  if (isCacheFirstRequest(url)) {
    event.respondWith(cacheFirstStrategy(event.request));
  } else {
    event.respondWith(networkFirstStrategy(event.request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
