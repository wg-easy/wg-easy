import { createApp, defineEventHandler, getHeader, toWebHandler } from 'h3';
import { defineI18nMiddleware } from '@intlify/h3';
import { describe, expect, test, vi } from 'vitest';

import translationMiddleware from '#server/middleware/00.translation';
import { useRequestTranslation } from '#server/http/translation';

// Exercise the H3 version serving the production Nuxt 4 build.
vi.mock('h3', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const nitroRequire = createRequire(require.resolve('nitropack/package.json'));
  return import(nitroRequire.resolve('h3'));
});

const i18n = defineI18nMiddleware({
  locale: async (event) => getHeader(event, 'accept-language') || 'en',
  messages: { en: { required: 'Required' }, de: { required: 'Erforderlich' } },
});
const app = toWebHandler(
  createApp(i18n)
    .use(translationMiddleware)
    .use(
      defineEventHandler(async (original) => {
        // Only the shared context crosses the compatibility boundary.
        const t = await useRequestTranslation({ context: original.context });
        return { message: t('required') };
      })
    )
);

function request(path: string, headers: Record<string, string> = {}) {
  return app(new Request(`https://vpn.example${path}`, { headers }));
}

describe('request translations', () => {
  test('keeps each concurrent request in its own language', async () => {
    const [de, en] = await Promise.all([
      request('/translate', { 'accept-language': 'de' }),
      request('/translate', { 'accept-language': 'en' }),
    ]);
    expect(await de.json()).toEqual({ message: 'Erforderlich' });
    expect(await en.json()).toEqual({ message: 'Required' });
  });
});
