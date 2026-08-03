import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // Service worker écrit à la main (src/sw.ts) pour gérer les notifications
      // push, que la génération automatique de Workbox ne permet pas.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Les réponses de l'API ne doivent jamais être mises en cache.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'Footix, le foot du vendredi',
        short_name: 'Footix',
        description: 'Qui vient jouer vendredi ? On répond, et le lieu se décide tout seul.',
        lang: 'fr',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Version dédiée : Android rogne les icônes maskable jusqu'à un cercle,
          // le terrain y est réduit pour que les coins ne soient jamais coupés.
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    // Ports atypiques et figés : ils s'ouvrent sur la machine du développeur, où
    // d'autres projets tournent en parallèle. strictPort fait échouer le
    // démarrage plutôt que de glisser en douce sur un port voisin déjà pris.
    port: 29173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:29301', changeOrigin: true },
    },
  },
});
