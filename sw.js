// Liveroo Service Worker v5
const CACHE_NAME = 'liveroo-v5';
const STATIC_ASSETS = [
  '/liveroo/',
  '/liveroo/index.html',
  '/liveroo/manifest.json',
  '/liveroo/icon.svg',
];

// Dominios externos que NUNCA se interceptan
const PASSTHROUGH_ORIGINS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'accounts.google.com',
  'agora.io',
  'sd-rtn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'download.agora.io',
  'cdnjs.cloudflare.com',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nunca interceptar peticiones a APIs externas
  if(PASSTHROUGH_ORIGINS.some(origin => url.hostname.includes(origin))) return;

  // Solo interceptar GET a rutas propias
  if(e.request.method !== 'GET') return;
  if(!url.pathname.startsWith('/liveroo')) return;

  // Network first — siempre intenta red, fallback a cache
  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok && res.status < 400){
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  let data = {
    title: 'Liveroo 🔴',
    body: '¡Hay algo nuevo para ti!',
    icon: '/liveroo/icon-192.png',
    badge: '/liveroo/icon-192.png',
    tag: 'liveroo',
    url: '/liveroo/'
  };
  try {
    const payload = e.data?.json();
    if(payload) data = {...data, ...payload};
  } catch(_) {
    if(e.data?.text()) data.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: { url: data.url },
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/liveroo/';
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
      const existing = clients.find(c => c.url.includes('/liveroo'));
      if(existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
