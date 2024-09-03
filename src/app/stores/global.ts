import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiChartType = ref(0);
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | number>(null);
  const latestRelease = ref<null | { version: number; changelog: string }>(
    null
  );
  const uiTrafficStats = ref(false);
  const enableExpireTime = ref(false);
  const enableOneTimeLinks = ref(false);
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

    if (
      Number(release.value!.currentRelease) >=
      release.value!.latestRelease.version
    ) {
      return;
    }

    currentRelease.value = Number(release.value!.currentRelease);
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

  async function fetchOneTimeLinks() {
    const { data: oneTimeLinks } = await api.getEnableOneTimeLinks();
    enableOneTimeLinks.value = oneTimeLinks.value ?? false;
  }

  async function fetchSortClients() {
    const { data: sortClients } = await api.getSortClients();
    enableSortClient.value = sortClients.value ?? false;
  }

  async function fetchExpireTime() {
    const { data: expireTime } = await api.getEnableExpireTime();
    enableExpireTime.value = expireTime.value ?? false;
  }

  const updateCharts = computed(() => {
    return uiChartType.value > 0 && uiShowCharts.value;
  });

  return {
    uiChartType,
    uiShowCharts,
    uiTrafficStats,
    updateCharts,
    enableSortClient,
    sortClient,
    enableExpireTime,
    enableOneTimeLinks,
    fetchRelease,
    fetchChartType,
    fetchTrafficStats,
    fetchOneTimeLinks,
    fetchSortClients,
    fetchExpireTime,
  };
});
