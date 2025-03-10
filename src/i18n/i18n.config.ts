import en from './locales/en.json';
import zh_cn from './locales/zh_cn.json';

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zh_cn,
  },
}));
