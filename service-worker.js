// ═════════════════════════════════════════════
// 전주 여행 PWA Service Worker v2
// 전략: HTML은 Network First, 리소스는 Cache First
// ═════════════════════════════════════════════

const CACHE_VERSION = 'v2';
const CACHE_NAME = `jeonju-travel-${CACHE_VERSION}`;

// 정적 리소스 (거의 안 바뀜) - Cache First
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 동적 리소스 (자주 바뀜) - Network First
const DYNAMIC_URLS = ['./', './index.html'];

// ═════════════════════════════════════════════
// [INSTALL] 설치 시 파일 캐싱
// ═════════════════════════════════════════════
self.addEventListener('install', (event) => {
  console.log('[SW] Install:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching files');
        return cache.addAll([...STATIC_ASSETS, ...DYNAMIC_URLS]);
      })
      .then(() => self.skipWaiting())
  );
});

// ═════════════════════════════════════════════
// [ACTIVATE] 옛 버전 캐시 삭제
// ═════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith('jeonju-travel-') && key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] 옛 캐시 삭제:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ═════════════════════════════════════════════
// [FETCH] 요청 처리
// ═════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  // 외부 도메인 무시
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  // GET만 처리
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  const pathname = url.pathname;
  
  const isHTMLDoc = 
    event.request.mode === 'navigate' ||
    pathname === '/' ||
    pathname.endsWith('/') ||
    pathname.endsWith('.html');
  
  if (isHTMLDoc) {
    // Network First
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || caches.match('./index.html'));
        })
    );
  } else {
    // Cache First
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// ═════════════════════════════════════════════
// [MESSAGE] 업데이트 명령 수신
// ═════════════════════════════════════════════
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
