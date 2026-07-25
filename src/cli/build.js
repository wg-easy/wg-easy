// @ts-check

import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

// Native modules that cannot be bundled and are handled separately in Docker
const external = ['argon2', '@libsql/client'];

await esbuild.build({
  entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
  bundle: true,
  outfile: fileURLToPath(new URL('../.output/server/cli.mjs', import.meta.url)),
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external,
  logLevel: 'info',
});
