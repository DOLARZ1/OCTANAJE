/* =====================================================================
   NEXUS · Service Worker — offline con estrategia stale-while-revalidate
   ===================================================================== */
const CACHE = "nexus-cache-v34";

const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/store.js", "./assets/js/audio.js", "./assets/js/charts.js",
  "./assets/js/ui.js", "./assets/js/icons.js", "./assets/js/foods.js", "./assets/js/gamification.js",
  "./assets/js/modules/dashboard.js", "./assets/js/modules/habits.js",
  "./assets/js/modules/finance.js", "./assets/js/modules/tasks.js",
  "./assets/js/modules/workouts.js", "./assets/js/modules/goals.js",
  "./assets/js/modules/focus.js", "./assets/js/modules/nutrition.js", "./assets/js/notifications.js",
  "./assets/js/settings.js", "./assets/js/app.js",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // add resiliente: si algún recurso falla no rompe la instalación
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(() => cached);
        return cached || network; // rápido desde caché, se actualiza en 2º plano
      })
    )
  );
});
