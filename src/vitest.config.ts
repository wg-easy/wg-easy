import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '#server': fileURLToPath(new URL('./server', import.meta.url)),
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
            '#app': fileURLToPath(new URL('./app', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      enabled: true,
    },
  },
});
