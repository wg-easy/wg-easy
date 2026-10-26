import { createError } from 'h3';

/** Upstream supports the latest AWG release; WireGuard accepts one interval. */
export function assertPersistentKeepalive(
  value: number | string | undefined,
  backend: string
) {
  if (typeof value === 'string' && value.includes('-') && backend !== 'awg') {
    throw createError({
      statusCode: 400,
      message: 'PersistentKeepalive ranges require AmneziaWG',
    });
  }
}
