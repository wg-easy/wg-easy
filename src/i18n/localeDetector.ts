import {
  tryCookieLocale,
  tryHeaderLocale,
  tryQueryLocale,
} from '@intlify/utils/h3';
import type { H3Event } from 'h3';

// TODO: use defineI18nLocaleDetector

export default (event: H3Event, config: { defaultLocale: string }) => {
  const query = tryQueryLocale(event, { lang: '' });
  if (query) {
    return query.toString();
  }

  const cookie = tryCookieLocale(event, {
    lang: '',
    name: 'i18n_redirected',
  });
  if (cookie) {
    return cookie.toString();
  }

  const header = tryHeaderLocale(event, { lang: '' });
  if (header) {
    return header.toString();
  }

  return config.defaultLocale;
};
