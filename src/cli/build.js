// @ts-check

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const isTrace =
  process.argv.slice(2).findIndex((arg) => arg === '--trace') !== -1;

/**
 * Writes files with needed imports to `../node_modules/.cache/wg-easy/trace.mjs`
 *
 * @param {import('esbuild').Metafile} metafile
 */
async function writeTrace(metafile) {
  const paths = [
    ...new Set(
      Object.values(metafile.outputs).flatMap((v) =>
        v.imports.map((v) => v.path)
      )
    ),
  ];
  const imports = paths.map((v) => `import '${v}';`).join('\n');

  const folderUrl = new URL('../node_modules/.cache/wg-easy/', import.meta.url);
  const folder = fileURLToPath(folderUrl);
  const filePath = fileURLToPath(new URL('./trace.mjs', folderUrl));

  await mkdir(folder, { recursive: true });
  await writeFile(filePath, imports);
}

function getOverrides() {
  if (isTrace) {
    return {
      outfile: undefined,
      write: false,
    };
  }
  return {};
}

const result = await esbuild.build({
  entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
  bundle: true,
  outfile: fileURLToPath(new URL('../.output/server/cli.mjs', import.meta.url)),
  platform: 'node',
  format: 'esm',
  packages: 'external',
  logLevel: 'info',
  metafile: true,
  ...getOverrides(),
});

if (isTrace) {
  await writeTrace(result.metafile);
}
