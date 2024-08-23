import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiChartType = ref(0);
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | number>(null);
  const latestRelease = ref<null | { version: number; changelog: string }>(
    null
  );
  const uiTrafficStats = ref(false);
  const rememberMeEnabled = ref(false);

  const enableSortClient = ref(false);
  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc

  const { availableLocales, locale } = useI18n();

  async function fetchRelease() {
    const { data: lang } = await api.getLang();
    if (
      lang.value !== getItem('lang') &&
      availableLocales.includes(lang.value!)
    ) {
      setItem('lang', lang.value!);
      locale.value = lang.value!;
    }

    // this is still called on client. why?
    const { data: release } = await api.getRelease();

    if (release.value!.currentRelease >= release.value!.latestRelease.version) {
      return;
    }

    currentRelease.value = release.value!.currentRelease;
    latestRelease.value = release.value!.latestRelease;
  }

  async function fetchChartType() {
    const { data: chartType } = await api.getChartType();
    uiChartType.value = chartType.value ?? 0;
  }

  async function fetchTrafficStats() {
    const { data: trafficStats } = await api.getTrafficStats();
    uiTrafficStats.value = trafficStats.value ?? false;
  }

  const updateCharts = computed(() => {
    return uiChartType.value > 0 && uiShowCharts.value;
  });

  return {
    uiChartType,
    uiShowCharts,
    uiTrafficStats,
    updateCharts,
    rememberMeEnabled,
    enableSortClient,
    sortClient,
    fetchRelease,
    fetchChartType,
    fetchTrafficStats,
  };
});
