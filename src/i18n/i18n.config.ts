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

export default defineI18nConfig(() => ({
  fallbackLocale: 'en',
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
