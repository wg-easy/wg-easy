import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
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

  const currentRelease = ref<null | string>(null);
  const latestRelease = ref<null | { version: string; changelog: string }>(
    null
  );
  const updateAvailable = ref(false);

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

  const uiShowCharts = ref(getItem('uiShowCharts') === '1');

  function toggleCharts() {
    setItem('uiShowCharts', uiShowCharts.value ? '1' : '0');
  }

  const uiChartType = ref(getItem('uiChartType') ?? 'area');

  /**
   * @throws if unsuccessful
   */
  async function updateLang(lang: string) {
    const response = await $fetch('/api/admin/lang', {
      method: 'post',
      body: { lang },
    });
    return response.success;
  }

  return {
    sortClient,
    setLanguage,
    currentRelease,
    latestRelease,
    updateAvailable,
    fetchRelease,
    uiShowCharts,
    toggleCharts,
    uiChartType,
    updateLang,
  };
});
