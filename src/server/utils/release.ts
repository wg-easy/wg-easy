export async function fetchLatestRelease() {
  try {
    const response = await $fetch<Record<string, string>>(
      'https://wg-easy.github.io/wg-easy/changelog.json',
      { method: 'get' }
    );
    const releasesArray = Object.entries(response).map(
      ([version, changelog]) => ({
        version: parseInt(version, 10),
        changelog: changelog,
      })
    );
    releasesArray.sort((a, b) => {
      return b.version - a.version;
    });

    if (releasesArray.length === 0) {
      throw new Error('Changelog is empty');
    }

    return releasesArray[0]!;
  } catch (e) {
    SERVER_DEBUG('Failed to fetch latest releases: ', e);
    return { version: 0, changelog: '' };
  }
}
