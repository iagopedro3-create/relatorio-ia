import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vercelApiPlugin } from './scripts/vite-api-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // /api/* no `vite dev`, no formato da Vercel (não entra no build).
    vercelApiPlugin(),
  ],
})
