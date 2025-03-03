export const useGlobalStore = defineStore('Global', () => {
  const { data: release } = useFetch('/api/release', {
    method: 'get',
  });

  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc

  // TODO: migrate to cookies

  const uiShowCharts = ref(getItem('uiShowCharts') === '1');

  function toggleCharts() {
    setItem('uiShowCharts', uiShowCharts.value ? '1' : '0');
  }

  const uiChartType = ref(getItem('uiChartType') ?? 'area');

  return {
    sortClient,
    release,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
