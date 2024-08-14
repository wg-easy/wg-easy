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

    const release = await api.getRelease();

    if (release.currentRelease >= release.latestRelease.version) return;

    currentRelease.value = release.currentRelease;
    latestRelease.value = release.latestRelease;
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
