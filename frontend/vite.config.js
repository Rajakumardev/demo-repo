import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the SPA is served by Vite and proxies `/api` to the Express
// server so cookies stay first-party. In production nginx performs the same
// proxying (see frontend/nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
