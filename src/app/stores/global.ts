import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const uiShowCharts = ref(getItem('uiShowCharts') === '1');
  const currentRelease = ref<null | number>(null);
  const latestRelease = ref<null | { version: number; changelog: string }>(
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
    fetchRelease,
    fetchFeatures,
  };
});
