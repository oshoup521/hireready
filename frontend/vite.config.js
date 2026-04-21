import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-register a service worker that updates itself on new deploys.
      registerType: 'autoUpdate',
      // The SW is disabled in `vite dev` by default; enable only for local PWA testing.
      devOptions: { enabled: false },

      // Manifest shown to the OS on install
      manifest: {
        name: 'HireReady — ATS Resume Scorer',
        short_name: 'HireReady',
        description:
          'Know your ATS score before you apply. Upload your resume and JD to get instant feedback.',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // Workbox — precache the built app shell; API calls stay network-only.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Don't try to precache the heavy sample PDFs — load them on demand.
        globIgnores: ['**/sample-*.pdf'],
        navigateFallback: '/index.html',
        // Skip Workbox entirely for /analyze and /compare so scoring always
        // runs against the live backend (offline = clear "network error").
        navigateFallbackDenylist: [/^\/analyze/, /^\/compare/, /^\/health/],
        runtimeCaching: [
          {
            // Google Fonts stylesheets — stale-while-revalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Google Fonts webfont files — cache-first, 1 year
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sample PDFs — cache on first fetch so the "Try sample" button
            // stays snappy on return visits.
            urlPattern: /\/sample-.*\.pdf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sample-pdfs',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Proxy API calls to the FastAPI backend in local development.
    // The browser calls same-origin (:5173), Vite forwards to :8000 — no CORS needed.
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/compare': 'http://localhost:8000',
      '/health':  'http://localhost:8000',
    },
  },
})
