export const useGlobalStore = defineStore('Global', () => {
  const { data: information, refresh: refreshInformation } = useFetch(
    '/api/information',
    {
      method: 'get',
    }
  );

  const sortClient = useCookie<
    'name-asc' | 'name-desc' | 'ipv4-asc' | 'ipv4-desc'
  >('sortClient', {
    default: () => 'name-asc',
    maxAge: 365 * 24 * 60 * 60,
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
    sortClient,
    information,
    refreshInformation,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
