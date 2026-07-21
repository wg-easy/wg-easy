import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '#db': fileURLToPath(new URL('./server/database', import.meta.url)),
            '#server': fileURLToPath(new URL('./server', import.meta.url)),
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
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
