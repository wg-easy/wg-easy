type GithubRelease = {
  tag_name: string;
  body: string;
};

/**
 * Cache function for 1 hour
 */
function cacheFunction<T>(fn: () => T): () => T {
  let cache: { value: T; expiry: number } | null = null;

  return (): T => {
    const now = Date.now();

    if (cache && cache.expiry > now) {
      return cache.value;
    }

    const result = fn();
    cache = {
      value: result,
      expiry: now + 3600000,
    };

    return result;
  };
}

async function fetchLatestRelease() {
  try {
    const response = await $fetch<GithubRelease>(
      'https://api.github.com/repos/wg-easy/wg-easy/releases/latest',
      { method: 'get' }
    );
    if (!response) {
      throw new Error('Empty Response');
    }
    const changelog = response.body.split('\r\n\r\n')[0] ?? '';
    return {
      version: response.tag_name,
      changelog,
    };
  } catch (e) {
    SERVER_DEBUG('Failed to fetch latest releases: ', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch latest release',
    });
  }
}

export const cachedFetchLatestRelease = cacheFunction(fetchLatestRelease);
