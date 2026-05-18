import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      external: [
        'electron',
        'electron-store',
        'node:fs',
        'node:path',
        'node:os',
        'node:util',
        'node:crypto',
        'node:process',
        'node:events',
        'node:stream',
        'node:assert',
        'fs',
        'path',
        'os',
        'crypto',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@/lib': path.resolve(__dirname, '../../src/lib'),
      '@/components': path.resolve(__dirname, '../../src/components'),
      '@/hooks': path.resolve(__dirname, '../../src/hooks'),
      '@/config': path.resolve(__dirname, '../../src/config'),
      '@/stores': path.resolve(__dirname, '../../src/stores'),
      '@/test-utils': path.resolve(__dirname, '../../src/test-utils'),
      '@nself-chat/core': path.resolve(__dirname, '../../../packages/core/src'),
      '@nself-chat/api': path.resolve(__dirname, '../../../packages/api/src'),
      '@nself-chat/state': path.resolve(__dirname, '../../../packages/state/src'),
      '@nself-chat/ui': path.resolve(__dirname, '../../../packages/ui/src'),
      '@nself-chat/config': path.resolve(__dirname, '../../../packages/config/src'),
      '@nself-chat/testing': path.resolve(__dirname, '../../../packages/testing/src'),
    },
  },
  optimizeDeps: {
    include: [
      '@nself-chat/core',
      '@nself-chat/api',
      '@nself-chat/state',
      '@nself-chat/ui',
      '@nself-chat/config',
    ],
  },
  server: {
    port: 5174,
    strictPort: false,
  },
})
