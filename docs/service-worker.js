const cacheName = "timer-cache-v1";
const assets = [
  "/counter.html",
  "/counter.js",
  "/counter.css",
  "/click.mp3",
  "/alert.wav",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json"
];

// Cache on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Serve from cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
