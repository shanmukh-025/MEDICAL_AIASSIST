// Service Worker for Push Notifications and Offline Support
const CACHE_NAME = 'medical-assistant-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx'
];

// Install event - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern
    tag: data.tag,
    requireInteraction: true, // Keep notification until user interacts
    actions: data.actions || [],
    data: data.data
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        // Play voice notification if enabled
        if (data.data && data.data.voice) {
          playVoiceNotification(data.body, data.data.language);
        }
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'taken') {
    // Mark medicine as taken
    event.waitUntil(
      fetch(`${self.registration.scope}api/reminders/${event.notification.data.reminderId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${event.notification.data.token}`
        }
      })
    );
  } else if (event.action === 'snooze') {
    // Snooze for 10 minutes
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: event.notification.icon,
        badge: event.notification.badge,
        vibrate: [200, 100, 200],
        requireInteraction: true
      });
    }, 10 * 60 * 1000); // 10 minutes
  } else {
    // Open app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Voice notification using Web Speech API
function playVoiceNotification(text, language) {
  // This will use the device's text-to-speech
  // Note: Some browsers may not support this in service workers
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.volume = 1.0;
    
    // Play the voice notification
    if ('speechSynthesis' in self) {
      self.speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('Voice notification failed:', error);
  }
}
