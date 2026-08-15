const CACHE = 'batco-customer-v33-0';
const CUSTOMER_PAGE = './customer.html';

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(new Request(req, { cache: 'no-store' }));
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch (error) {
        return (await cache.match(req)) || (await cache.match(CUSTOMER_PAGE)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) await cache.put(req, fresh.clone());
      return fresh;
    } catch (error) {
      return (await cache.match(req)) || Response.error();
    }
  })());
});
