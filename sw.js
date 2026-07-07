/* LL Service Worker — 連線優先(online 一定拿最新,offline 用快取) */
const CACHE = "ll-v4";
const ASSETS = ["./", "./index.html", "./words.js", "./words-pack1.js", "./langs-pack1.js", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 連線優先:有網路就抓最新版(並更新快取);沒網路才用快取。
// 這樣改版後,手機一連網重開就會拿到新版,不會被舊快取卡住。
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 外部資源(圖片等)不攔
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
