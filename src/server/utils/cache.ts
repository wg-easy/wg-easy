type Opts = {
  /**
   * Expiry time in milliseconds
   */
  expiry: number;
};

/**
 * Cache function for 1 hour
 */
export function cacheFunction<T>(
  fn: () => Promise<T>,
  { expiry }: Opts
): () => Promise<T> {
  let cache: { value: Promise<T>; expiry: number } | null = null;

  return (): Promise<T> => {
    const now = Date.now();

    if (cache && cache.expiry > now) {
      return cache.value;
    }

    const result = fn().catch((error) => {
      if (cache?.value === result) {
        cache = null;
      }

      throw error;
    });

    cache = {
      value: result,
      expiry: now + expiry,
    };

    return result;
  };
}
