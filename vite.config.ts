import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // For GitHub Pages project sites, set VITE_BASE_PATH to match the repository name:
  // https://<USERNAME>.github.io/<REPO>/ should use VITE_BASE_PATH="/<REPO>/".
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
