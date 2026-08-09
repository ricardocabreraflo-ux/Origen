const CACHE_NAME = "origen-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/css/style.css",
  "/js/script.js",
  "/manifest.json",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Solo el cascarón estático (CSS/JS/iconos/HTML de inicio) se sirve desde caché
// como respaldo sin conexión. Todo lo demás (API, config.json) siempre va a
// la red para no mostrar horarios o citas desactualizadas.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;
  if (url.pathname.startsWith("/admin")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && SHELL_ASSETS.includes(url.pathname)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
