// ============================================
// SERVICE WORKER - Turnamen Domino Samarinda
// ============================================
const CACHE_NAME = 'domino-samarinda-v1';
const CACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-pordi.png',
    './header-domino.png',
    './kartu-44.png',
    './kartu-45.png',
    './kartu-56.png',
    './kartu-66.png',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// Install: Cache semua aset
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(CACHE_URLS).catch((err) => {
                console.log('[SW] Beberapa file gagal di-cache:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate: Hapus cache lama
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Strategi Network First (untuk data Firebase real-time)
// dengan fallback ke cache (untuk aset statis)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Jangan cache request ke Firebase (butuh real-time)
    if (url.hostname.includes('firebase') || url.hostname.includes('firebaseio')) {
        return; // Biarkan browser handle langsung
    }

    // Untuk request GET saja
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Simpan response ke cache untuk dipakai offline
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Jika offline, ambil dari cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Fallback ke index.html untuk navigasi
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline - Konten tidak tersedia', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                });
            })
    );
});

// Handle message dari halaman (untuk skipWaiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
