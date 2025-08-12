const CACHE_NAME = "exercise-tools-v1";
const FILES_TO_CACHE = [
  "index.html",
  "counter.html",
  "interval.html",
  "style.css",
  "counter.css",
  "interval.css",
  "script.js",
  "counter.js",
  "interval.js",
  "docs/icon-192.png",
  "docs/icon-512.png",
  "docs/click.mp3",
  "docs/alert.wav",
  "manifest.json"
];

// Install service worker and cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch files from cache first, then network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
