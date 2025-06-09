import en from './locales/en.json';
import uk from './locales/uk.json';
import fr from './locales/fr.json';

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  messages: {
    en,
    uk,
    fr,
  },
}));
