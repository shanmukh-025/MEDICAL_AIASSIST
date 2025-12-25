import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Village Medicine Assistant',
        short_name: 'VillageMed',
        description: 'Offline-ready medical assistant for rural areas',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Defines what to cache
        runtimeCaching: [
          {
            // Cache Google Maps & OpenStreetMaps tiles (so maps work partially offline)
            urlPattern: /^https:\/\/(tile\.openstreetmap\.org|.*\.google\.com)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 Days
            }
          },
          {
            // Cache API calls (e.g., Records) so you can see old data offline
            urlPattern: /^http:\/\/localhost:5000\/api\/.*/,
            handler: 'NetworkFirst', // Try net first, fallback to cache if offline
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } // 1 Day
            }
          }
        ]
      }
    })
  ],
});