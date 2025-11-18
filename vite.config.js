import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    port: 5173,
    https: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  define: {
    'import.meta.env.DEV': process.env.NODE_ENV === 'development',
    'import.meta.env.PROD': process.env.NODE_ENV === 'production',
  }
})
