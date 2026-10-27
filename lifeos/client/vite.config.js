import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api is proxied to the API server (same-origin → cookies work out of the box).
// Prod build: requests go straight to VITE_API_URL (deploy-time variable).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      // Own dedicated port: LifePulse (the PWA project in "To Do List") owns
      // 5173 and its launcher evicts anything squatting on it, so LifeOS
      // must not fight LifePulse for this port anymore.
      port: 5221,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
