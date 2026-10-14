// オフライン用の控え。まず控えから出して速く起動し、裏でネットから取り直して控えを新しくする。
// そのため、公開し直した内容が効くのは「次にアプリを開いたとき」。
const CACHE = "kas-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "vendor/phaser.min.js", "src/main.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request);
    const net = fetch(e.request).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
