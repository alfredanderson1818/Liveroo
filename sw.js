// Liveroo Service Worker v3
const CACHE_NAME = 'liveroo-v3';
const STATIC_ASSETS = [
  '/Liveroo/',
  '/Liveroo/index.html',
  '/Liveroo/manifest.json',
  '/Liveroo/icon.svg',
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
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if(!url.pathname.startsWith('/Liveroo')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok){const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));}
      return res;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  let data = {
    title: 'Liveroo 🔴',
    body: '¡Hay algo nuevo para ti!',
    icon: '/Liveroo/icon-192.png',
    badge: '/Liveroo/icon-192.png',
    tag: 'liveroo',
    url: '/Liveroo/'
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
  const url = e.notification.data?.url || '/Liveroo/';
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
      const existing = clients.find(c => c.url.includes('/Liveroo'));
      if(existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
