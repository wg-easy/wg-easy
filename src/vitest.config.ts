import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '#db': resolve(__dirname, './server/database'),
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
    },
  },
});
