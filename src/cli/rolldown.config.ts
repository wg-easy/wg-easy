import { fileURLToPath } from 'node:url';
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: fileURLToPath(new URL('./index.ts', import.meta.url)),
  output: {
    format: 'esm',
    file: fileURLToPath(new URL('../.output/server/cli.mjs', import.meta.url)),
  },
  platform: 'node',
  external: [/^[^./]|^\.[^./]|^\.\.[^/]/],
  logLevel: 'info',
});
