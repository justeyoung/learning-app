// service-worker.js — simple offline cache for the app
// Keep this list aligned with your folder structure under /docs

const CACHE_NAME = "exercise-app-v4";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",

  // CSS
  "./assets/css/style.css",
  "./assets/css/core.css",
  "./assets/css/counter.css",
  "./assets/css/interval.css",

  // JS (only the ones that exist)
  "./assets/js/core.js",
  "./assets/js/counter.js",
  "./assets/js/interval1.js",

  // App entry pages
  "./apps/core/core.html",
  "./apps/counter/counter.html",
  "./apps/interval/interval.html",
  "./apps/axis/index.html",

  // Core audio (keep minimal; add more later if you want)
  "./assets/audio/alert.wav",
  "./assets/audio/click.mp3",
  "./assets/audio/celebration.mp3",
  "./assets/audio/new_exercise.mp3",
];

// Install — cache known assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for same-origin GET requests, network fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  // Only handle same-origin (your site) requests
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Cache successful basic responses
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // If offline and requesting a page, fall back to home
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
          return cached; // may be undefined; that's okay
        });
    })
  );
});