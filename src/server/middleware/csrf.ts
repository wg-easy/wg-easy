import { defineEventHandler, createError } from 'nuxt/server';

import { WG_ENV } from '#server/utils/config';
import { getTrustedRequestURL } from '#server/http/request';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export default defineEventHandler((event) => {
  if (safeMethods.has(event.req.method)) return;

  // Match the public origin, including deployments that terminate TLS at a proxy.
  const target = getTrustedRequestURL(event, WG_ENV.TRUSTED_PROXIES);
  target.protocol = WG_ENV.INSECURE ? 'http:' : 'https:';

  const origin = event.req.headers.get('origin');
  // Only an absent Origin may fall back; empty and "null" origins must fail.
  const sourceOrigin =
    origin ?? URL.parse(event.req.headers.get('referer') ?? '')?.origin;
  if (sourceOrigin === target.origin) return;

  // Apply before authentication: login and setup need CSRF protection too.
  // Basic credentials and missing headers do not prove a same-origin request.
  throw createError({
    status: 403,
    statusText: 'Invalid request origin',
  });
});
