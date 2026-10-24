// SignSense service worker: saves the app so it opens without internet
// after the first visit, and makes it installable.
// Change VERSION when the list below changes, so old copies are cleared.
const VERSION = 'signsense-v2';
const APP_FILES = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'
];
// Hand tracker, text reader and font files: saved the first time they load.
const LIBRARY_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function save(req, res) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app's own files: try the internet first so updates show up right
  // away; use the saved copy when offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => save(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Library files don't change, so the saved copy is used when there is one.
  if (LIBRARY_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => save(req, res))));
  }
  // Everything else (the translation service) always goes to the internet.
});
