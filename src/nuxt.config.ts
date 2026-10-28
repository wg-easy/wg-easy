import { fileURLToPath } from 'node:url';

import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-06-19',
  future: {
    compatibilityVersion: 5,
  },
  experimental: {
    // @nuxtjs/i18n still imports Nitro's useRuntimeConfig from #imports.
    // Application server code keeps explicit imports via nitro.imports below.
    nitroAutoImports: true,
  },
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    'reka-ui/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storage: 'cookie',
    storageKey: 'theme',
  },
  css: ['~/app.css'],
  vite: { plugins: [tailwindcss()] },
  i18n: {
    compilation: {
      // Protocol examples such as <b 0x...> are literal text, escaped by Vue.
      strictMessage: false,
    },
    // https://i18n.nuxtjs.org/docs/guide/server-side-translations
    experimental: {
      localeDetector: './localeDetector.ts',
    },
    // https://wg-easy.github.io/wg-easy/latest/contributing/translation/
    locales: [
      {
        code: 'en',
        file: 'en.json',
        language: 'en-US',
        name: 'English',
      },
      {
        code: 'de',
        file: 'de.json',
        language: 'de-DE',
        name: 'Deutsch',
      },
      {
        code: 'es',
        file: 'es.json',
        language: 'es-ES',
        name: 'Español',
      },
      {
        code: 'it',
        file: 'it.json',
        language: 'it-IT',
        name: 'Italiano',
      },
      {
        code: 'ja',
        file: 'ja.json',
        language: 'ja-JP',
        name: '日本語',
      },
      {
        code: 'fr',
        file: 'fr.json',
        language: 'fr-FR',
        name: 'Français',
      },
      {
        code: 'ko',
        file: 'ko.json',
        language: 'ko-KR',
        name: '한국어',
      },
      {
        code: 'ru',
        file: 'ru.json',
        language: 'ru-RU',
        name: 'Русский',
      },
      {
        code: 'uk',
        file: 'uk.json',
        language: 'uk-UA',
        name: 'Українська',
      },
      {
        code: 'zh-CN',
        file: 'zh-CN.json',
        language: 'zh-CN',
        name: '简体中文',
      },
      {
        code: 'zh-HK',
        file: 'zh-HK.json',
        language: 'zh-HK',
        name: '繁體中文（香港）',
      },
      {
        code: 'zh-TW',
        file: 'zh-TW.json',
        language: 'zh-TW',
        name: '正體中文 (台灣)',
      },
      {
        code: 'pl',
        file: 'pl.json',
        language: 'pl-PL',
        name: 'Polski',
      },
      {
        code: 'cs',
        file: 'cs.json',
        language: 'cs-CZ',
        name: 'Čeština',
      },
      {
        code: 'pt-BR',
        file: 'pt-BR.json',
        language: 'pt-BR',
        name: 'Português (Brasil)',
      },
      {
        code: 'pt-PT',
        file: 'pt-PT.json',
        language: 'pt-PT',
        name: 'Português (Portugal)',
      },
      {
        code: 'tr',
        file: 'tr.json',
        language: 'tr-TR',
        name: 'Türkçe',
      },
      {
        code: 'bn',
        file: 'bn.json',
        language: 'bn-BD',
        name: 'বাংলা',
      },
      {
        code: 'id',
        file: 'id.json',
        language: 'id-ID',
        name: 'Bahasa Indonesia',
      },
      {
        code: 'nl',
        file: 'nl.json',
        language: 'nl-NL',
        name: 'Nederlands',
      },
      {
        code: 'nb',
        file: 'nb.json',
        language: 'nb-NO',
        name: 'Norsk bokmål',
      },
      {
        code: 'bg',
        file: 'bg.json',
        language: 'bg-BG',
        name: 'Български',
      },
      {
        code: 'hi',
        file: 'hi.json',
        language: 'hi-IN',
        name: 'हिन्दी',
      },
      {
        code: 'gl',
        file: 'gl.json',
        language: 'gl-ES',
        name: 'Galego',
      },
      {
        code: 'vi',
        file: 'vi.json',
        language: 'vi-VN',
        name: 'Tiếng Việt',
      },
      {
        code: 'sv',
        file: 'sv.json',
        language: 'sv-SE',
        name: 'Svenska',
      },
      {
        code: 'az',
        file: 'az.json',
        language: 'az-AZ',
        name: 'Azərbaycan',
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
    imports: {
      autoImport: false,
    },
    esbuild: {
      options: {
        target: 'node24',
      },
    },
    externals: {
      traceInclude: [
        fileURLToPath(
          new URL('./node_modules/.cache/wg-easy/trace.mjs', import.meta.url)
        ),
      ],
    },
  },
  alias: {
    '#db': fileURLToPath(new URL('./server/database/', import.meta.url)),
    '#cli': fileURLToPath(new URL('./cli', import.meta.url)),
  },
});
