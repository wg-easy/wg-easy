// Adapted from p-memoize v8.0.0 (MIT), by Sindre Sorhus:
// https://github.com/sindresorhus/p-memoize/blob/a006ac3224bbeb344cb62976e7f18bbc5ad61d14/index.ts
// Simplified to one no-argument loader, with expiration after successful loads.

type CacheOptions = {
  /** Finite, non-negative lifetime in milliseconds; 0 only shares pending work. */
  expiry: number;
};

/**
 * Share one pending load and retain its successful value in memory for `expiry` ms.
 * Lifetime starts at completion, measured with a monotonic clock. Failures retry.
 * Always returns a promise; values are shared by reference. Loaders own timeouts.
 */
export function cacheFunction<T>(
  load: () => T | PromiseLike<T>,
  { expiry }: CacheOptions
): () => Promise<T> {
  if (!Number.isFinite(expiry) || expiry < 0) {
    throw new RangeError('Cache expiry must be a finite, non-negative number');
  }

  let entry: { value: T; expiresAt: number } | undefined;
  let pending: Promise<T> | undefined;

  return () => {
    if (pending) return pending;
    if (entry && performance.now() < entry.expiresAt) {
      return Promise.resolve(entry.value);
    }
    entry = undefined;

    // Register pending work before invoking the loader, including synchronous ones.
    pending = Promise.resolve()
      .then(load)
      .then((value) => {
        if (expiry > 0) {
          entry = { value, expiresAt: performance.now() + expiry };
        }
        return value;
      })
      .finally(() => {
        pending = undefined;
      });

    return pending;
  };
}
