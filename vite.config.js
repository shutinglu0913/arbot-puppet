import { defineConfig } from 'vite';

export default defineConfig({
  base: '/arbot-puppet/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
