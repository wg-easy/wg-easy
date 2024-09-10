import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | string>(null);
  const latestRelease = ref<null | { version: string; changelog: string }>(
    null
  );
  const updateAvailable = ref(false);
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

  async function setLanguage() {
    const { data: lang } = await api.getLang();
    if (
      lang.value !== getItem('lang') &&
      availableLocales.includes(lang.value!)
    ) {
      setItem('lang', lang.value!);
      locale.value = lang.value!;
    }
  }

  async function fetchRelease() {
    const { data: release } = await api.getRelease();

    if (!release.value) {
      return;
    }

    currentRelease.value = release.value.currentRelease;
    latestRelease.value = release.value.latestRelease;
    updateAvailable.value = release.value.updateAvailable;
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
    updateAvailable,
    fetchRelease,
    fetchFeatures,
    setLanguage,
  };
});
