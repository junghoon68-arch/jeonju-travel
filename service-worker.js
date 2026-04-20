// ═════════════════════════════════════════
// 전주 여행 PWA Service Worker
// ═════════════════════════════════════════
const CACHE_NAME = 'jeonju-travel-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// [설치] 파일 캐싱
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching files');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// [활성화] 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Delete old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// [Fetch] Cache First 전략 (오프라인 우선)
self.addEventListener('fetch', (event) => {
  // 외부 도메인(naver.me, 구글, 네이버 등)은 캐싱 안 함
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // GET 요청만 캐싱
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 캐시 히트 → 즉시 반환
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 캐시 미스 → 네트워크 요청
      return fetch(event.request).then((networkResponse) => {
        // 정상 응답만 캐시에 저장
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 네트워크 실패 시 → index.html 반환 (오프라인 fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
