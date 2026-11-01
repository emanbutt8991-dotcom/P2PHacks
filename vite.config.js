import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the built site also works from a sub-folder (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
