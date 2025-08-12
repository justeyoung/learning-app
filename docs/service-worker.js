const CACHE_NAME = "exercise-app-v1";
const ASSETS_TO_CACHE = [
  "/",                // root (index.html)
  "/index.html",
  "/style.css",
  "/counter.html",
  "/interval.html",
  "/script.js",       // if your quiz script is still needed
  "/counter.js",      // your counter app JS file
  "/interval.js",     // your interval app JS file
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/doc/alert.wav",   // timer sound
  "/doc/click.mp3"    // click sound
];

// Install event — caching assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — serve from cache if offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          // Fallback if needed, e.g., return offline page here
        })
      );
    })
  );
});
