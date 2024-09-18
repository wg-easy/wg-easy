import en from './locales/en.json';
import ua from './locales/ua.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import no from './locales/no.json';
import pl from './locales/pl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ca from './locales/ca.json';
import es from './locales/es.json';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import nl from './locales/nl.json';
import is from './locales/is.json';
import pt from './locales/pt.json';
import zhChs from './locales/zh-chs.json';
import zhCht from './locales/zh-cht.json';
import it from './locales/it.json';
import th from './locales/th.json';
import hi from './locales/hi.json';

const LOCALES = [
  { value: 'en', name: 'English' },
  { value: 'ua', name: 'Українська' },
  { value: 'ru', name: 'Русский' },
  { value: 'tr', name: 'Türkçe' },
  { value: 'no', name: 'Norsk' },
  { value: 'pl', name: 'Polski' },
  { value: 'fr', name: 'Français' },
  { value: 'de', name: 'Deutsch' },
  { value: 'ca', name: 'Català' },
  { value: 'es', name: 'Español' },
  { value: 'ko', name: '한국어' },
  { value: 'vi', name: 'Tiếng Việt' },
  { value: 'nl', name: 'Nederlands' },
  { value: 'is', name: 'Íslenska' },
  { value: 'pt', name: 'Português' },
  { value: 'zh-chs', name: '简体中文' },
  { value: 'zh-cht', name: '繁體中文' },
  { value: 'it', name: 'Italiano' },
  { value: 'th', name: 'ไทย' },
  { value: 'hi', name: 'हिन्दी' },
];

export { LOCALES };

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en,
    ua,
    ru,
    // Müslüm Barış Korkmazer @babico
    tr,
    // github.com/digvalley
    no,
    // github.com/archont94
    pl,
    // github.com/clem3109
    fr,
    de,
    // github.com/guillembonet
    ca,
    // github.com/amarqz
    es,
    ko,
    // https://github.com/hoangneeee
    vi,
    nl,
    is,
    pt,
    zhChs,
    zhCht,
    it,
    th,
    // github.com/rahilarious
    hi,
  },
}));
