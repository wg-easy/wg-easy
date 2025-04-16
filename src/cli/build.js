// @ts-check

import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
  bundle: true,
  outfile: fileURLToPath(new URL('../.output/server/cli.mjs', import.meta.url)),
  platform: 'node',
  format: 'esm',
  plugins: [
    {
      name: 'make-all-packages-external',
      setup(build) {
        let filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
  logLevel: 'info',
});
