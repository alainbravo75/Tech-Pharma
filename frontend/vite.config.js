import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Tech-Pharma',
        short_name: 'Tech-Pharma',
        description: 'Application de gestion de pharmacie - fonctionne hors ligne',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache les assets statiques (app shell) - stratégie "cache first"
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Les appels API ne sont JAMAIS mis en cache par le service worker :
        // la gestion offline des données est entièrement gérée par Dexie/IndexedDB,
        // ce qui évite les incohérences entre deux mécanismes de cache différents.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
