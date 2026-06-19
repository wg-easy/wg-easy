// @ts-check

import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

esbuild.build({
  entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
  bundle: true,
  outfile: fileURLToPath(new URL('../.output/server/cli.mjs', import.meta.url)),
  platform: 'node',
  format: 'esm',
  packages: 'external',
  logLevel: 'info',
});
