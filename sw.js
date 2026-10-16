// オフライン用の控え。入れたときに files.json（build_site.sh が作る全ファイルの一覧）を全部控える。
// 以後はまず控えから出して速く起動し、裏でネットから取り直して控えを新しくする。
// 新しい版の 控えが できたら、ひらいている 画面を 1回だけ 読みなおす（main.js の controllerchange）。
const CACHE = "kas-v21";

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const files = await (await fetch("files.json", { cache: "no-store" })).json();
    // ブラウザに 残った 古いファイルを つかまないよう、かならず ネットから 取り直す（2026-10-16 タブレットに 新しい版が 出なかった）
    await cache.addAll(["./", ...files].map(f => new Request(f, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
