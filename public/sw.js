// FrantoS service worker: the app shell and demo media work offline.
// Navigations: network first (fresh deploys win), cached shell as fallback.
// Static assets (hashed bundles, demo media): cache first.
const CACHE = 'frantos-v12';
const SHARE = 'frantos-share';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.ico', '/icons/icon-192.png', '/brand/wordmark-white.webp', '/brand/wordmark-black.webp', '/brand/jonikstyle-light.webp', '/brand/jonikstyle-dark.webp'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== SHARE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Share target: keep the shared files for the share screen, then open it
  if (req.method === 'POST' && new URL(req.url).pathname === '/share') {
    e.respondWith(
      (async () => {
        const form = await req.formData();
        const files = form.getAll('files').filter((f) => typeof f !== 'string');
        const c = await caches.open(SHARE);
        await Promise.all((await c.keys()).map((k) => c.delete(k)));
        await Promise.all(files.map((f, i) => c.put(`/shared/${i}`, new Response(f, { headers: { 'Content-Type': f.type, 'X-Name': encodeURIComponent(f.name || `shared-${i}`) } }))));
        const q = new URLSearchParams();
        ['title', 'text', 'url'].forEach((k) => form.get(k) && q.set(k, String(form.get(k))));
        q.set('files', String(files.length));
        return Response.redirect(`/#/share?${q.toString()}`, 303);
      })()
    );
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase & signed URLs: always network
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (/^\/(assets|projects|series|icons|brand|screenshots)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
  }
});
