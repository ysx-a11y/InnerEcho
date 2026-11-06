/* InnerEcho Service Worker — 只缓存公开静态资源，绝不缓存 /api 响应（隐私） */
const CACHE_NAME = 'innerecho-static-v3';
const ASSET_PREFIX = '/assets/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // 预缓存应用外壳（首页 HTML）；失败不影响安装（首次可能离线/超时）
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/').catch(() => {})).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 隐私边界：API 请求（登录、测评、统计等）一律直连，不进缓存
  if (url.pathname.startsWith('/api/')) return;

  // 带 hash 的静态资源：内容不可变，缓存优先
  if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          })
      )
    );
    return;
  }

  // 所有导航（含首页）网络优先、失败回退缓存：保证每次部署 purge 后，
  // 用户第一次访问即拿到最新 HTML/资源，而不是多看到一版缓存里的旧应用。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('/'))
        )
    );
  }
});
