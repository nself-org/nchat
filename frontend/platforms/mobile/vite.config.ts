/**
 * Vite Configuration for @nself-chat/mobile
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nself-chat/core': path.resolve(__dirname, '../../../packages/core/src'),
      '@nself-chat/api': path.resolve(__dirname, '../../../packages/api/src'),
      '@nself-chat/state': path.resolve(__dirname, '../../../packages/state/src'),
      '@nself-chat/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@nself-chat/config': path.resolve(__dirname, '../../../packages/config/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
    port: 3001,
    host: true,
  },
})
