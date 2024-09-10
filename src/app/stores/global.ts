import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | string>(null);
  const latestRelease = ref<null | { version: string; changelog: string }>(
    null
  );
  const features = ref({
    trafficStats: {
      enabled: false,
      type: 0,
    },
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

    const { data: release } = await api.getRelease();

    if (!release.value) {
      return;
    }

    if (!release.value.updateAvailable) {
      return;
    }

    currentRelease.value = release.value.currentRelease;
    latestRelease.value = release.value.latestRelease;
  }

  async function fetchFeatures() {
    const { data: apiFeatures } = await api.getFeatures();
    if (apiFeatures.value) {
      features.value = apiFeatures.value;
    }
  }

  const updateCharts = computed(() => {
    return features.value.trafficStats.type > 0 && uiShowCharts.value;
  });

  return {
    uiShowCharts,
    updateCharts,
    sortClient,
    features,
    currentRelease,
    latestRelease,
    fetchRelease,
    fetchFeatures,
  };
});
