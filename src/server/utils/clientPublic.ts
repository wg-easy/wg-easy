/**
 * Drop WireGuard secrets from a client row before returning it over the API.
 */
export function omitClientSecrets<
  T extends { privateKey?: unknown; preSharedKey?: unknown },
>(client: T): Omit<T, 'privateKey' | 'preSharedKey'> {
  const {
    privateKey: _privateKey,
    preSharedKey: _preSharedKey,
    ...rest
  } = client;
  return rest;
}
