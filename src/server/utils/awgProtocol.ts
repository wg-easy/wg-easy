import { createError } from 'h3';

export const AWG_VERSIONS = ['3.1', '3.0', '2.0'] as const;
export type AwgVersion = (typeof AWG_VERSIONS)[number];
export type AwgVersionRequest = AwgVersion | 'latest';

const VERSION_3_PARAMETERS = new Set([
  'HeaderProtectionKey',
  'ContentPaddingAddition',
  'RekeyAfterTime',
  'RekeyTimeout',
  'RejectAfterTime',
  'KeepaliveTimeout',
  'MaxHandshakeAttempts',
]);
const VERSION_31_PARAMETERS = new Set(['RandomTrailers', 'DisableCookies']);

export function parseAwgVersion(value: string | undefined): AwgVersionRequest {
  switch (value?.trim().toLowerCase()) {
    case undefined:
    case '':
    case 'latest':
      return 'latest';
    case '2':
    case '2.0':
      return '2.0';
    case '3':
    case '3.0':
      return '3.0';
    case '3.1':
      return '3.1';
    default:
      throw new Error(
        'AWG_PROTOCOL_VERSION must be 2, 2.0, 3, 3.0, 3.1 or latest'
      );
  }
}

export function parseAwgAutoGenerate(value: string | undefined) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('AWG_AUTO_GENERATE must be true or false');
}

export function supportsAwgParameter(version: AwgVersion, key: string) {
  if (VERSION_31_PARAMETERS.has(key)) return version === '3.1';
  if (VERSION_3_PARAMETERS.has(key)) return version !== '2.0';
  return true;
}

export function filterAwgParameters<T>(
  parameters: Record<string, T>,
  version: AwgVersion | null | undefined
) {
  if (!version) return parameters;
  return Object.fromEntries(
    Object.entries(parameters).filter(([key]) =>
      supportsAwgParameter(version, key)
    )
  );
}

/** Accepts database/API field names, including client default fields. */
export function assertAwgParameters(
  version: AwgVersion | null | undefined,
  fields: object
) {
  if (!version) return;
  for (const [field, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue;
    const name = field.replace(/^default/, '');
    const key = name.charAt(0).toUpperCase() + name.slice(1);
    if (!supportsAwgParameter(version, key)) {
      throw createError({
        statusCode: 400,
        message: `${key} is not supported by the saved AWG ${version} profile`,
      });
    }
  }
}
