import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { createHandlerBoundToURL } from 'workbox-precaching';

// ─── Workbox Precaching (injected by vite-plugin-pwa at build time) ────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// ─── Navigation Route (SPA support) ───────────────────────────────────────
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// ─── Runtime Caching ──────────────────────────────────────────────────────

// API calls - NetworkFirst
registerRoute(
    /^https?:\/\/(localhost:5000|.*\.railway\.app|.*\.onrender\.com)\/api\/.*/,
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        plugins: [
            new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 2 }),
            new CacheableResponsePlugin({ statuses: [0, 200] })
        ]
    })
);

// Images - CacheFirst
registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    new CacheFirst({
        cacheName: 'image-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })]
    })
);

// Fonts - CacheFirst
registerRoute(
    /\.(?:woff|woff2|ttf|eot)$/,
    new CacheFirst({
        cacheName: 'font-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })]
    })
);

// CSS/JS - StaleWhileRevalidate
registerRoute(
    /\.(?:js|css)$/,
    new StaleWhileRevalidate({
        cacheName: 'static-resources',
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })]
    })
);

// CDN resources - CacheFirst
registerRoute(
    /^https:\/\/cdn\..*/,
    new CacheFirst({
        cacheName: 'cdn-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }),
            new CacheableResponsePlugin({ statuses: [0, 200] })
        ]
    })
);

// Google Fonts - CacheFirst
registerRoute(
    /^https:\/\/fonts\.googleapis\.com\/.*/,
    new CacheFirst({
        cacheName: 'google-fonts-cache',
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })]
    })
);

// ─── Push Notification Handler ────────────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'MediAssist AI', body: event.data.text() };
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || `mediassist-${Date.now()}`,
        requireInteraction: data.requireInteraction !== false,
        actions: data.actions || [],
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'MediAssist AI', options)
    );
});

// ─── Notification Click Handler ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const targetUrl = data.url || '/';

    if (event.action === 'taken') {
        // Mark medicine as taken
        const reminderId = data.reminderId;
        const timing = data.timing;
        event.waitUntil(
            fetch(`/api/patient-monitoring/medicine-taken/${reminderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': data.token || ''
                },
                body: JSON.stringify({ timing: timing || '' })
            }).catch(err => console.error('Failed to mark taken:', err))
        );
    } else if (event.action === 'snooze') {
        // Snooze for 10 minutes
        setTimeout(() => {
            self.registration.showNotification(event.notification.title, {
                body: event.notification.body,
                icon: event.notification.icon,
                badge: event.notification.badge,
                vibrate: [200, 100, 200],
                requireInteraction: true,
                data: data
            });
        }, 10 * 60 * 1000);
    } else {
        // Default: Open app or focus existing window
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(targetUrl);
            })
        );
    }
});
