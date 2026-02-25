// ======================================================
// service-worker.js
// Offline cache for Learning App Suite
// ======================================================

const CACHE_NAME = "exercise-app-v6";

/*
Keep this aligned with /docs structure
Only cache files that actually exist
*/

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",

  // ======================
  // GLOBAL CSS
  // ======================
  "./assets/css/style.css",
  "./assets/css/core.css",
  "./assets/css/counter.css",
  "./assets/css/interval.css",

  // ======================
  // GLOBAL JS
  // ======================
  "./assets/js/core.js",
  "./assets/js/counter.js",
  "./assets/js/interval1.js",

  // ======================
  // APPS
  // ======================
  "./apps/core/core.html",
  "./apps/counter/counter.html",
  "./apps/interval/interval.html",
  "./apps/axis/index.html",

  // --- KEGAL APP ---
  "./apps/kegal/index.html",
  "./apps/kegal/style.css",
  "./apps/kegal/app.js",

  // ======================
  // AUDIO (minimal)
  // ======================
  "./assets/audio/alert.wav",
  "./assets/audio/click.mp3",
  "./assets/audio/celebration.mp3",
  "./assets/audio/new_exercise.mp3",
];


// ======================================================
// INSTALL
// ======================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );

  self.skipWaiting();
});


// ======================================================
// ACTIVATE — remove old caches
// ======================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});


// ======================================================
// FETCH — cache first, network fallback
// ======================================================
self.addEventListener("fetch", (event) => {

  const req = event.request;

  // only GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // same-origin only
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {

      // ✅ serve cached immediately
      if (cached) return cached;

      // otherwise fetch
      return fetch(req)
        .then(res => {

          if (
            res &&
            res.status === 200 &&
            res.type === "basic"
          ) {
            const copy = res.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(req, copy));
          }

          return res;
        })
        .catch(() => {

          // offline HTML fallback
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }

        });
    })
  );
});