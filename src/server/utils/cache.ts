type Opts = {
  /**
   * Expiry time in milliseconds
   */
  expiry: number;
};

/**
 * Cache the result of a function for the given expiry time in milliseconds
 */
export function cacheFunction<T>(fn: () => T, { expiry }: Opts): () => T {
  let cache: { value: T; expiry: number } | null = null;

  return (): T => {
    const now = Date.now();

    if (cache && cache.expiry > now) {
      return cache.value;
    }

    const result = fn();
    cache = {
      value: result,
      expiry: now + expiry,
    };

    if (result instanceof Promise) {
      // A rejected lookup must be tried again. The caller still sees it.
      void result.then(
        () => undefined,
        () => {
          if (cache?.value === result) {
            cache = null;
          }
        }
      );
    }

    return result;
  };
}
