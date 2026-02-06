export const useGlobalStore = defineStore('Global', () => {
  const { data: information } = useFetch('/api/information', {
    method: 'get',
  });

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
    information,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
