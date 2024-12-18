import en from './locales/en.json';

export default defineI18nConfig(() => ({
  fallbackLocale: 'en',
  legacy: false,
  locale: 'en',
  messages: {
    en,
  },
}));
