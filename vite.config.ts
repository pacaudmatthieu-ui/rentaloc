import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Deux sorties :
// - build normal (Vercel) : chunks hashés, cache navigateur optimal
// - build « wp » (npm run build:wp) : UN SEUL fichier rentaloc.js + un
//   rentaloc.css, noms stables sans hash, pour l'intégration WordPress
//   via jsDelivr (dossier dist-wp/ committé par GitHub Actions)
export default defineConfig(({ mode }) => {
  if (mode === 'wp') {
    return {
      plugins: [react()],
      base: './',
      build: {
        outDir: 'dist-wp',
        emptyOutDir: true,
        cssCodeSplit: false,
        chunkSizeWarningLimit: 4000,
        rollupOptions: {
          output: {
            entryFileNames: 'rentaloc.js',
            assetFileNames: 'rentaloc.[ext]',
            inlineDynamicImports: true,
          },
        },
      },
    }
  }
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // Découpage en paquets mis en cache séparément par le navigateur :
          // une mise à jour de l'app ne re-télécharge pas React ni les graphiques
          manualChunks: {
            charts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})
