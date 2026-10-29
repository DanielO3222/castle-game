const VERSION = 'htk-v1.5.2';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'editor.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  ...['keep','stockpile','granary','woodcutter','quarry','farm','house','barracks','tower','trees','rock','gate'].map(n => 'assets/' + n + '.png')];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // network first (so updates show up), fall back to cache when offline
  e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
