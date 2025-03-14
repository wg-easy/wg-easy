type Opts = {
  /**
   * Expiry time in milliseconds
   */
  expiry: number;
};

/**
 * Cache function for 1 hour
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

    return result;
  };
}
