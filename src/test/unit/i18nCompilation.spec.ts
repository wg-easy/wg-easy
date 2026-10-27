import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadNuxt } from 'nuxt';
import { expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const i18nRequire = createRequire(require.resolve('@nuxtjs/i18n'));
const compilerRequire = createRequire(
  i18nRequire.resolve('@intlify/unplugin-vue-i18n')
);
const { generateJSON } = await import(
  pathToFileURL(compilerRequire.resolve('@intlify/bundle-utils')).href
);
const { createI18n } = await import(
  pathToFileURL(i18nRequire.resolve('vue-i18n')).href
);

const nuxt = await loadNuxt({
  cwd: fileURLToPath(new URL('../../', import.meta.url)),
  ready: false,
  dotenv: false,
});
const localesDir = new URL('../../i18n/locales/', import.meta.url);

test.each(readdirSync(localesDir).filter((file) => file.endsWith('.json')))(
  'compiles %s for lazy loading and preserves protocol syntax',
  async (file) => {
    const source = readFileSync(new URL(file, localesDir), 'utf8');
    const { code } = generateJSON(source, {
      type: 'plain',
      env: 'development',
      jit: true,
      ...nuxt.options.i18n.compilation,
      onError: (message: string) => {
        throw new Error(message);
      },
    });
    const { default: messages } = await import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    );
    const i18n = createI18n({
      legacy: false,
      locale: 'test',
      messages: { test: messages },
      warnHtmlMessage: false,
    });
    const original = JSON.parse(source);
    for (let index = 1; index <= 5; index++) {
      const key = `i${index}Description`;
      if (original.awg?.[key]) {
        expect(i18n.global.t(`awg.${key}`)).toBe(original.awg[key]);
      }
    }
  }
);
