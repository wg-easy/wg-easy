import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { transformSync } from 'esbuild';
import type { Component } from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';

const require = createRequire(import.meta.url);

// Compile the real templates without starting Nuxt or a browser.
export function loadComponent(
  path: string,
  {
    ssr = false,
    imports = {},
  }: { ssr?: boolean; imports?: Record<string, unknown> } = {}
): Component {
  const { descriptor } = parse(
    readFileSync(
      new URL(`../../app/components/${path}.vue`, import.meta.url),
      'utf8'
    )
  );
  const script = compileScript(descriptor, {
    id: path,
    inlineTemplate: true,
    templateOptions: { ssr },
  });
  const { code } = transformSync(script.content, {
    loader: 'ts',
    format: 'cjs',
  });
  const module = { exports: {} as { default: Component } };
  new Function('require', 'module', 'exports', code)(
    (id: string) => (Object.hasOwn(imports, id) ? imports[id] : require(id)),
    module,
    module.exports
  );
  return module.exports.default;
}
