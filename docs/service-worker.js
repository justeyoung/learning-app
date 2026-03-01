// service-worker.js — offline cache for /docs site
// Bump CACHE_NAME whenever you change file paths or add/remove assets.

const CACHE_NAME = "exercise-app-v13";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./.nojekyll",


  // CSS
  "./assets/css/style.css",
  "./apps/bp-tracker/style.css",
  "./assets/css/core.css",
  "./assets/css/counter.css",
  "./apps/isometric/style.css",
  "./assets/css/interval.css",

  // JS
  "./apps/isometric/app.js",
  "./assets/js/core.js",
  "./assets/js/counter.js",
  "./assets/js/interval1.js",
  "./apps/bp-tracker/app.js",

  // App pages
  "./apps/core/core.html",
  "./apps/counter/counter.html",
  "./apps/interval/interval.html",
  "./apps/axis/index.html",
  "./apps/kegal/index.html",
  "./apps/bp-tracker/index.html",
  "./apps/bp-tracker/info.html",
  "./apps/isometric/index.html",

  // Minimal audio used by apps
  "./assets/audio/alert.wav",
  "./assets/audio/click.mp3",
  "./assets/audio/celebration.mp3",
  "./assets/audio/new_exercise.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // cache successful basic responses
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // offline fallback for pages
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
          return cached;
        });
    })
  );
});