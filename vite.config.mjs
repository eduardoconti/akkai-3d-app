import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui';
          }

          if (id.includes('@mui/x-date-pickers') || id.includes('dayjs')) {
            return 'date';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'state';
          }

          if (id.includes('axios')) {
            return 'network';
          }

          return 'vendor';
        },
      },
    },
  },
});
