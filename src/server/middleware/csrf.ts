import { defineEventHandler, createError } from 'nuxt/server';

import { WG_ENV } from '#server/utils/config';
import { getTrustedRequestURL } from '#server/http/request';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export default defineEventHandler((event) => {
  // Opt in through proxy configuration until the next major release.
  if (WG_ENV.TRUSTED_PROXIES.length === 0) return;
  if (safeMethods.has(event.req.method)) return;

  const target = getTrustedRequestURL(
    event,
    WG_ENV.TRUSTED_PROXIES,
    WG_ENV.INSECURE ? 'http' : 'https'
  );

  const origin = event.req.headers.get('origin');
  // Only an absent Origin may fall back; empty and "null" origins must fail.
  const sourceOrigin =
    origin ?? URL.parse(event.req.headers.get('referer') ?? '')?.origin;
  if (sourceOrigin === target.origin) return;

  // Protect login and setup too; credentials do not bypass origin validation.
  throw createError({
    status: 403,
    statusText: 'Invalid request origin',
  });
});
