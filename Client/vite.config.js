import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,          // allow external access
    port: 5174,
    allowedHosts: true, // allow ngrok/dev tunnels
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // your backend
        changeOrigin: true,
      },
    },
  },
});