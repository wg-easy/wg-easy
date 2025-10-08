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
    // https://wg-easy.github.io/wg-easy/latest/contributing/translation/
    locales: [
      {
        code: 'en',
        language: 'en-US',
        name: 'English',
      },
      {
        code: 'de',
        language: 'de-DE',
        name: 'Deutsch',
      },
      {
        code: 'es',
        language: 'es-ES',
        name: 'Español',
      },
      {
        code: 'it',
        language: 'it-IT',
        name: 'Italiano',
      },
      {
        code: 'fr',
        language: 'fr-FR',
        name: 'Français',
      },
      {
        code: 'ko',
        language: 'ko-KR',
        name: '한국어',
      },
      {
        code: 'ru',
        language: 'ru-RU',
        name: 'Русский',
      },
      {
        code: 'uk',
        language: 'uk-UA',
        name: 'Українська',
      },
      {
        code: 'zh-CN',
        language: 'zh-CN',
        name: '简体中文',
      },
      {
        code: 'zh-HK',
        language: 'zh-HK',
        name: '繁體中文（香港）',
      },
      {
        code: 'pl',
        language: 'pl-PL',
        name: 'Polski',
      },
      {
        code: 'pt-BR',
        language: 'pt-BR',
        name: 'Português (Brasil)',
      },
      {
        code: 'tr',
        language: 'tr-TR',
        name: 'Türkçe',
      },
      {
        code: 'bn',
        language: 'bn-BD',
        name: 'বাংলা',
      },
      {
        code: 'id',
        language: 'id-ID',
        name: 'Bahasa Indonesia',
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
        target: 'node20',
      },
    },
    alias: {
      '#db': fileURLToPath(new URL('./server/database/', import.meta.url)),
      '#utils': fileURLToPath(new URL('./server/utils/', import.meta.url)),
    },
    externals: {
      traceInclude: [fileURLToPath(new URL('./cli/index.ts', import.meta.url))],
    },
  },
  alias: {
    // for typecheck reasons (https://github.com/nuxt/cli/issues/323)
    '#db': fileURLToPath(new URL('./server/database/', import.meta.url)),
    '#utils': fileURLToPath(new URL('./server/utils/', import.meta.url)),
  },
});
