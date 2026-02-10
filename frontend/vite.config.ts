import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { en } from 'zod/locales';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: env.VITE_PORT,
        host: '0.0.0.0',
        proxy: {
          '/auth': env.VITE_API_URL,
          '/api': env.VITE_API_URL,
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
