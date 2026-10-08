import { createError } from 'h3';

import type { AwgVersion } from '#server/utils/awgProtocol';

export function supportsKeepaliveRanges(
  backend: string,
  version: AwgVersion | null | undefined
) {
  return backend === 'awg' && (version === '3.0' || version === '3.1');
}

export function assertPersistentKeepalive(
  value: number | string | undefined,
  backend: string,
  version: AwgVersion | null | undefined
) {
  if (
    typeof value === 'string' &&
    value.includes('-') &&
    !supportsKeepaliveRanges(backend, version)
  ) {
    throw createError({
      statusCode: 400,
      message:
        'PersistentKeepalive ranges require a saved AWG 3.0 or 3.1 profile',
    });
  }
}
