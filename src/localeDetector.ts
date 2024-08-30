// https://i18n.nuxtjs.org/docs/guide/server-side-translations
// Detect based on query, cookie, header
export default defineI18nLocaleDetector((event, config) => {
  // try to get locale from query
  const query = tryQueryLocale(event, { lang: '' }); // disable locale default value with `lang` option
  if (query) {
    return query.toString();
  }

  // try to get locale from cookie
  const cookie = tryCookieLocale(event, { lang: '', name: 'i18n_locale' }); // disable locale default value with `lang` option
  if (cookie) {
    return cookie.toString();
  }

  // try to get locale from header (`accept-header`)
  const header = tryHeaderLocale(event, { lang: '' }); // disable locale default value with `lang` option
  if (header) {
    return header.toString();
  }

  // If the locale cannot be resolved up to this point, it is resolved with the value `defaultLocale` of the locale config passed to the function
  return config.defaultLocale;
});
