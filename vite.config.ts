import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import type { Plugin } from 'vite';

const createE2EApiFallbackPlugin = (): Plugin => ({
  name: 'e2e-api-fallback',
  configureServer(server) {
    server.middlewares.use('/api', (_request, response) => {
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: 'Backend unavailable in E2E smoke tests' }));
    });
  },
});

export default defineConfig(({ mode }) => {
  const isE2E = mode === 'e2e';

  return {
    // Cloudflare Pages serves the app at the domain root. VITE_BASE_PATH is kept only for
    // nonstandard static preview hosts that need a subpath.
    base: process.env.VITE_BASE_PATH ?? '/',
    plugins: [react(), ...(isE2E ? [createE2EApiFallbackPlugin()] : [])],
    server: {
      ...(isE2E
        ? {}
        : {
            proxy: {
              '/api': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
              },
            },
          }),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  };
});
