// Lets Gastos open without internet and shows its notifications. Bump VERSION when you upload a new index.html.
const VERSION = "gastos-v24";
const CORE = ["./", "index.html", "onboarding.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Pages: try the network first so updates show up, fall back to the saved copy offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy));
      return res;
    }).catch(() => caches.match("index.html")));
    return;
  }
  // Only the app's own files and its fonts are cached; live data (dólar, inflación) always goes to the network
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});

// Notifications sent by the Cloudflare mailbox (iOS requires showing one for every push)
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {body:e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "Gastos", {
    body:d.body || "", tag:d.tag || undefined, icon:"icon-192.png", badge:"icon-192.png", data:{url:d.url || "./"},
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    for (const c of list) if ("focus" in c) { c.postMessage({type:"open", url:target}); return c.focus(); }
    return clients.openWindow(target);
  }));
});
