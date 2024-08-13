import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiChartType = ref(0);
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | number>(null);
  const latestRelease = ref<null | { version: number; changelog: string }>(
    null
  );
  const uiTrafficStats = ref(false);

  const { availableLocales, locale } = useI18n();

  async function fetchRelease() {
    const lang = await api.getLang();
    if (lang !== getItem('lang') && availableLocales.includes(lang)) {
      setItem('lang', lang);
      locale.value = lang;
    }

    const _currentRelease = await api.getRelease();
    const _latestRelease = await fetch(
      'https://wg-easy.github.io/wg-easy/changelog.json'
    )
      .then((res) => res.json())
      .then((releases) => {
        const releasesArray = Object.entries(releases).map(
          ([version, changelog]) => ({
            version: parseInt(version, 10),
            changelog: changelog as string,
          })
        );
        releasesArray.sort((a, b) => {
          return b.version - a.version;
        });

        return releasesArray[0];
      });

    if (_currentRelease >= _latestRelease.version) return;

    currentRelease.value = _currentRelease;
    latestRelease.value = _latestRelease;
  }

  async function fetchChartType() {
    api
      .getChartType()
      .then((res) => {
        uiChartType.value = res;
      })
      .catch(() => {
        uiChartType.value = 0;
      });
  }

  async function fetchUITrafficStats() {
    api
      .getUITrafficStats()
      .then((res) => {
        uiTrafficStats.value = res;
      })
      .catch(() => {
        uiTrafficStats.value = false;
      });
  }

  const updateCharts = computed(() => {
    return uiChartType.value > 0 && uiShowCharts.value;
  });

  return {
    uiChartType,
    uiShowCharts,
    uiTrafficStats,
    updateCharts,
    fetchRelease,
    fetchChartType,
    fetchUITrafficStats,
  };
});
