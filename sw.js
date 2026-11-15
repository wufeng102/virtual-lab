// Service worker: aplikasi tetap bisa dibuka tanpa internet setelah kunjungan pertama.
const CACHE = 'vlmkt-v1.5.1';
const ASSETS = [
  './', './index.html', './config.js', './manifest.webmanifest',
  './css/style.css',
  './js/core.js', './js/ui.js', './js/mod-ads.js', './js/mod-market.js', './js/mod-analytics.js',
  './js/mod-research.js', './js/mod-strategy.js', './js/mod-funnel.js', './js/skills-data.js', './js/vendor/qrcode.js', './js/skills.js', './js/cert.js', './assets/logo.png', './assets/signature.png', './icons/apple-touch-icon.png', './js/mod-ai.js', './js/api.js', './js/auth.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Halaman: jaringan dulu, cadangan dari cache. Aset: cache dulu, perbarui di latar belakang.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
