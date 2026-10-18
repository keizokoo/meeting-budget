/* 마이라이프 서비스 워커 (2026-10-18)
   - 항상 네트워크 최신본을 먼저 받아오고, 인터넷이 안 될 때만 저장해 둔 사본을 보여 줍니다.
   - 예전 버전이 남긴 캐시(옛 앱 이름·옛 화면)는 이 파일이 적용되는 순간 모두 지웁니다.
   - Apps Script·구글 폰트 등 다른 사이트 요청은 건드리지 않습니다. */
const VER = 'mylife-2026-10-18-g';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.ok) { const c = await caches.open(VER); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const c = await caches.open(VER);
      return (await c.match(req)) || (await c.match('./index.html')) || (await c.match('./')) || Response.error();
    }
  })());
});
