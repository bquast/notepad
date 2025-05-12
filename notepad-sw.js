const CACHE_NAME = 'notepad-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    // Add any icons or other static assets here
    '/icons/notepad-192.png', // Example icon
    '/icons/notepad-512.png'  // Example icon
];

// Install event: Cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Failed to open cache and add URLs:', err);
            })
    );
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: clearing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control of all clients without a page reload
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', event => {
    // We only want to cache GET requests for our assets
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    // Serve from cache
                    return response;
                }
                // Not in cache, fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        // Optionally, cache new requests dynamically if needed
                        // Be careful with what you cache here to avoid filling up storage.
                        // For this app, static assets are cached on install.
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error("Fetch failed; returning offline page instead.", error);
                    // You could return a generic offline page here if a specific asset fails
                    // and it's not one of the initially cached assets.
                    // For a simple app, if core assets are cached, this might not be strictly necessary.
                });
            })
    );
});