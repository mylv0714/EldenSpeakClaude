import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)) },
  },
  server: {
    port: 5173,
    // The API server (src/server) runs on 8787 in dev; the web app always calls relative /api.
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
