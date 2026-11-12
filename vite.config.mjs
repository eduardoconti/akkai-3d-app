import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Injeta no service worker a lista de arquivos do build (para o app abrir por
 * completo sem internet) e um identificador que renova o cache a cada versão.
 */
function serviceWorkerPrecache() {
  let outDir = 'dist';

  return {
    name: 'akkai-service-worker-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const assetsDir = join(outDir, 'assets');
      const files = (await readdir(assetsDir)).filter((file) =>
        /\.(js|css|woff2)$/.test(file),
      );
      const assets = files.sort().map((file) => `/assets/${file}`);
      const buildId = createHash('sha1')
        .update(assets.join('\n'))
        .digest('hex')
        .slice(0, 10);
      const swPath = join(outDir, 'sw.js');
      const source = await readFile(swPath, 'utf8');

      await writeFile(
        swPath,
        source
          .replace("'__BUILD_ID__'", `'${buildId}'`)
          .replace("'__PRECACHE_ASSETS__'", JSON.stringify(assets)),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPrecache()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
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
