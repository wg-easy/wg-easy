type GithubRelease = {
  tag_name: string;
};

export async function fetchLatestRelease() {
  try {
    const response = await $fetch<GithubRelease>(
      'https://api.github.com/repos/wg-easy/wg-easy/releases/latest',
      { method: 'get' }
    );
    if (!response) {
      throw new Error('Empty Response');
    }
    // TODO: changelog
    return { version: response.tag_name, changelog: '' };
  } catch (e) {
    SERVER_DEBUG('Failed to fetch latest releases: ', e);
    return { version: 'v0.0.0', changelog: '' };
  }
}
