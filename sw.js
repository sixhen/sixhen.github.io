// sixhen Service Worker v3.0
const CACHE_NAME = 'sixhen-cache-v3';
const STATIC_ASSETS = [
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/discord.js',
    './js/music.js',
    './js/terminal.js',
    './js/reactions.js',
    './js/skinview.js',
    './assets/favicon.svg',
    './assets/avatar.jpg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Network first, fallback to cache
    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request);
        })
    );
});
