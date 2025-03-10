import { fileURLToPath } from 'node:url';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2025-02-04',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@eschricht/nuxt-color-mode',
    'radix-vue/nuxt',
    '@nuxt/eslint',
  ],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    cookieName: 'theme',
  },
  i18n: {
    // https://i18n.nuxtjs.org/docs/guide/server-side-translations
    experimental: {
      localeDetector: './localeDetector.ts',
    },
    locales: [
      {
        code: 'en',
        language: 'en-US',
        name: 'English',
      },
      {
        code: 'zh',
        language: 'zh-CN',
        name: '中文',
      },
    ],
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
    },
  },
  nitro: {
    esbuild: {
      options: {
        // to support big int
        target: 'es2020',
      },
    },
    alias: {
      '#db': fileURLToPath(new URL('./server/database/', import.meta.url)),
    },
  },
  alias: {
    // for typecheck reasons (https://github.com/nuxt/cli/issues/323)
    '#db': fileURLToPath(new URL('./server/database/', import.meta.url)),
  },
});
