import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Emit dist/404.html as a copy of index.html.
 *
 * GitHub Pages (and Render, and a few others) serve 404.html for any path they
 * cannot resolve to a file. Handing them the app means a hard reload of
 * /vault boots the SPA instead of showing a "page not found", and the router
 * then reads the original URL and lands on the right screen.
 *
 * The other hosts are covered declaratively — public/_redirects for Netlify
 * and Cloudflare Pages, vercel.json for Vercel. All three are inert on hosts
 * that do not read them, which is why it is worth shipping all three rather
 * than betting on one.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const index = path.resolve(__dirname, 'dist/index.html');
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.resolve(__dirname, 'dist/404.html'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), spaFallback()],
    build: {
      // Split the two big dependencies out of the app chunk. They change far
      // less often than the game code, so a phone that has loaded the app once
      // re-uses them from cache when anything ships. It also stops one 540KB
      // file from being a single parse-and-compile block on a low-end device.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion', 'motion/react'],
            // Same reasoning as the two above, and it earns its place harder
            // than either: the client is ~70KB gzipped, it changes only when
            // the dependency is bumped, and a phone that has loaded the game
            // once should never download it again for a copy tweak.
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
