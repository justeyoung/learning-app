// Service Worker for "Exercise Tools" (index + counter + interval)
const CACHE_NAME = "exercise-tools-v2";  // bump this when you change files

// List every file your app needs offline
const FILES_TO_CACHE = [
  // entry points
  "index.html",
  "counter.html",
  "interval.html",

  // shared
  "manifest.json",
  "service-worker.js",

  // styles
  "style.css",
  "counter.css",
  "interval.css",

  // scripts
  "script.js",
  "counter.js",
  "interval.js",

  // sounds & icons (keep even if you use Web Audio; good fallback)
  "docs/click.mp3",
  "docs/alert.wav",
  "docs/icon-192.png",
  "docs/icon-512.png"
];

// Install: cache everything up-front
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first, then network (simple & reliable offline)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
