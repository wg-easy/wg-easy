import en from './locales/en.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ru from './locales/ru.json';
import zhhk from './locales/zh-HK.json';
import zhcn from './locales/zh-CN.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ptbr from './locales/pt-BR.json';
import tr from './locales/tr.json';
import bn from './locales/bn.json';
import id from './locales/id.json';

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  // Disable strict mode to prevent deepCopy errors with locale merging
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  // Use shallow merging to avoid deepCopy issues
  mergeFallbackMessage: true,
  messages: {
    en,
    pl,
    uk,
    fr,
    de,
    it,
    ru,
    'zh-HK': zhhk,
    'zh-CN': zhcn,
    ko,
    es,
    'pt-BR': ptbr,
    tr,
    bn,
    id,
  },
}));
