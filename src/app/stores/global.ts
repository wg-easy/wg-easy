import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | string>(null);
  const latestRelease = ref<null | { version: string; changelog: string }>(
    null
  );
  const updateAvailable = ref(false);
  const features = ref({
    sortClients: {
      enabled: false,
    },
    clientExpiration: {
      enabled: false,
    },
    oneTimeLinks: {
      enabled: false,
    },
  });
  const statistics = ref({
    enabled: false,
    chartType: 0,
  });
  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc

  const { availableLocales, locale } = useI18n();

  async function setLanguage() {
    const { data: lang } = await useFetch('/api/lang', {
      method: 'get',
    });
    if (
      lang.value !== getItem('lang') &&
      availableLocales.includes(lang.value!)
    ) {
      setItem('lang', lang.value!);
      locale.value = lang.value!;
    }
  }

  async function fetchRelease() {
    const { data: release } = await useFetch('/api/release', {
      method: 'get',
    });

    if (!release.value) {
      return;
    }

    currentRelease.value = release.value.currentRelease;
    latestRelease.value = release.value.latestRelease;
    updateAvailable.value = release.value.updateAvailable;
  }

  async function fetchFeatures() {
    const { data: apiFeatures } = await useFetch('/api/features', {
      method: 'get',
    });
    if (apiFeatures.value) {
      features.value = apiFeatures.value;
    }
  }

  async function fetchStatistics() {
    const { data: apiStatistics } = await useFetch('/api/statistics', {
      method: 'get',
    });
    if (apiStatistics.value) {
      statistics.value = apiStatistics.value;
    }
  }

  const updateCharts = computed(() => {
    return statistics.value.chartType > 0 && uiShowCharts.value;
  });

  /**
   * @throws if unsuccessful
   */
  async function updateLang(language: string) {
    const response = await api.updateLang({ lang: language });
    return response.success;
  }

  return {
    uiShowCharts,
    updateCharts,
    sortClient,
    features,
    currentRelease,
    latestRelease,
    updateAvailable,
    statistics,
    fetchRelease,
    fetchFeatures,
    setLanguage,
    fetchStatistics,
    updateLang,
  };
});
