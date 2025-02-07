import en from './locales/en.json';
import zh_cn from './locales/zh-cn.json';

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  messages: {
    en,
    zh_cn,
  },
}));
