import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // For GitHub Pages project sites, set VITE_BASE_PATH to match the repository name:
  // https://<USERNAME>.github.io/<REPO>/ should use VITE_BASE_PATH="/<REPO>/".
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
