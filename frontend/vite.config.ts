import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// In dev the React app runs on :5173 and proxies /api to the Spring backend on :8080.
// In production Spring serves the built app and the API from the same origin, so /api is relative.
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_BACKEND ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
