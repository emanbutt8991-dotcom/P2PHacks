import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Absolute base: client-side routes such as /app/map must resolve assets from the root.
// /api is proxied to the Node server in development, so secrets never reach the browser.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
