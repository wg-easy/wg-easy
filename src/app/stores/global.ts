export const useGlobalStore = defineStore('Global', () => {
  const { data: release } = useFetch('/api/release', {
    method: 'get',
  });

  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc

  const uiShowCharts = useCookie<boolean>('uiShowCharts', {
    default: () => false,
    maxAge: 365 * 24 * 60 * 60,
  });

  function toggleCharts() {
    uiShowCharts.value = !uiShowCharts.value;
  }

  const uiChartType = useCookie<'area' | 'bar' | 'line'>('uiChartType', {
    default: () => 'area',
    maxAge: 365 * 24 * 60 * 60,
  });

  return {
    sortClient,
    release,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
