import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // rollupOptions: {
    //   input: {
    //     main: fileURLToPath(new URL('./src/main.js', import.meta.url)),
    //     index: fileURLToPath(new URL('./src/index.html', import.meta.url)),
    //   }
    // }
  },
});
