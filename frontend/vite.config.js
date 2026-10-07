import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the SPA is served by Vite and proxies `/api` to the Express
// server so cookies stay first-party. In production nginx performs the same
// proxying (see frontend/nginx.conf).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      // The unit-testable logic surface: helpers, auth context and components.
      // Page-level UI is exercised separately and excluded here.
      include: [
        'src/lib/**/*.{js,jsx}',
        'src/context/**/*.{js,jsx}',
        'src/components/**/*.{js,jsx}',
      ],
      exclude: ['src/**/*.{test,spec}.{js,jsx}', 'src/test/**'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
  },
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
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
