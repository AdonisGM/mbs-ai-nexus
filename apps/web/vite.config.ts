import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  /** 5273 rather than the usual 5173: another project on this machine already
   *  holds that port, and two dev servers fighting over one is a confusing ten
   *  minutes every time. */
  server: { port: 5273 },
  /** No source maps in a build, not even as separate files. A deployed bundle
   *  that ships its own source hands over every rule inside it. Vite already
   *  defaults this off; it is written down so an upgrade cannot quietly
   *  change its mind. */
  build: { sourcemap: false },
  css: { devSourcemap: false },
})
