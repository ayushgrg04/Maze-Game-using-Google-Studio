import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  // By setting publicDir to false, we prevent Vite from using the 'public' directory by default.
  // This gives us full control over asset handling with vite-plugin-static-copy,
  // avoiding conflicts with files like 'public/service-worker.js'.
  publicDir: false,
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // Copy all necessary static assets from the project root to the output 'dist' directory.
        { src: 'icons', dest: '' },
        { src: 'sounds', dest: '' },
        { src: 'splash.png', dest: '' },
        { src: 'home-page-background.png', dest: '' },
        { src: 'privacy_policy.html', dest: '' },
        { src: 'manifest.json', dest: '' },
        { src: 'service-worker.js', dest: '' },
      ]
    })
  ],
  define: {
    // This makes the process.env.API_KEY variable available in the client-side code.
    // The value is injected at build time by the build environment (e.g., Netlify).
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
