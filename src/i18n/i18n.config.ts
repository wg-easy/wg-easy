import en from './locales/en.json';
import uk from './locales/uk.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import zhhk from './locales/zh-HK.json';
import zhcn from './locales/zh-CN.json';
import ko from './locales/ko.json';

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  messages: {
    en,
    uk,
    fr,
    de,
    ru,
    'zh-HK': zhhk,
    'zh-CN': zhcn,
    ko,
  },
}));
