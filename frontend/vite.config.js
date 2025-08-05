import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@fortawesome': '@fortawesome',
    },
  },
  server: {
    port: 5175,
  },
  envPrefix: 'VITE_',
});