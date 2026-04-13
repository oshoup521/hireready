import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the FastAPI backend in local development.
    // The browser calls same-origin (:5173), Vite forwards to :8000 — no CORS needed.
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/health':  'http://localhost:8000',
    },
  },
})
