import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png', 'offline.html'],
      manifest: {
        name: 'MemoKard - เมมโมการ์ด',
        short_name: 'MemoKard',
        description: 'เมมโมการ์ด - แอปพลิเคชันช่วยจำด้วยระบบ Active Recall และ Spaced Repetition',
        theme_color: '#a855f7',
        background_color: '#f8fafc',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        lang: 'th',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'ทบทวนวันนี้',
            short_name: 'ทบทวน',
            description: 'เปิด MemoKard เพื่อทบทวนการ์ดที่ถึงกำหนด',
            url: '/?shortcut=review',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'สำรวจชุดการ์ด',
            short_name: 'สำรวจ',
            description: 'ค้นหาชุดการ์ดจากชุมชน',
            url: '/?shortcut=explore',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // ไม่ precache ฟอนต์: มีหลาย subset/น้ำหนัก เบราว์เซอร์โหลดเฉพาะที่ใช้จริง แล้วค่อย cache ตอนใช้ (ด้านล่าง)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // รูปการ์ดจาก PocketBase — เก็บไว้ดูออฟไลน์ได้ (ข้อมูล API อื่นไม่ cache เพราะมี IndexedDB แล้ว)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/files/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (/node_modules[\\/]pocketbase[\\/]/.test(id)) {
            return 'vendor-pocketbase';
          }

          if (
            /node_modules[\\/](react|react-dom|scheduler|framer-motion|lucide-react|zustand|idb-keyval|ts-fsrs|canvas-confetti)[\\/]/.test(id)
          ) {
            return 'vendor-app';
          }
        }
      }
    }
  }
})
