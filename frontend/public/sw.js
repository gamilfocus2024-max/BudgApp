// Register event listener for the 'install' event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('budgapp-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/logo192.png',
                '/logo512.png'
            ]);
        })
    );
});

// Cache-first strategy for requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
