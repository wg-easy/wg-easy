import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('Global', () => {
  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc

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

  return {
    sortClient,
    currentRelease,
    latestRelease,
    updateAvailable,
    fetchRelease,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
