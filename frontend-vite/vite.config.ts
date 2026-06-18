/**
 * Purpose:    Vite SPA configuration for the ɳChat client (migrated from Next.js frontend/).
 *             Replaces next.config.js — Vite bundles, react-router-dom handles routing.
 * Inputs:     React TSX source under src/, Tailwind CSS, @nself/* workspace packages.
 * Outputs:    dist/ static bundle with index.html as the single entry point.
 * Constraints:SPA mode — every route is served via index.html (vercel.json/nginx rewrite).
 *             /api dev-proxies to the legacy backend so cookie auth + GraphQL work in dev.
 * Usage:      `pnpm dev` (port 3000) · `pnpm build`.
 * SOT:        F-NCHAT-VITE-CONFIG-01
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Dev: proxy /api (legacy BFF / auth bridge) and /v1 (Hasura) to the local backend.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
})
