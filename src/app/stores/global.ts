export const useGlobalStore = defineStore('Global', () => {
  const { data: information } = useFetch('/api/information', {
    method: 'get',
  });

  const sortClient = ref(true); // Sort clients by name, true = asc, false = desc
  const isFirstCopyOneTimeLink = ref(true); // Flag to track if it's the first time the copy one-time link is clicked

  const uiShowCharts = useCookie<boolean>('uiShowCharts', {
    default: () => false,
    maxAge: 365 * 24 * 60 * 60,
  });

  function toggleCharts() {
    uiShowCharts.value = !uiShowCharts.value;
  }

  function setFirstCopyOneTimeLink(value: boolean) {
    isFirstCopyOneTimeLink.value = value;
  }

  const uiChartType = useCookie<'area' | 'bar' | 'line'>('uiChartType', {
    default: () => 'area',
    maxAge: 365 * 24 * 60 * 60,
  });

  return {
    sortClient,
    information,
    uiShowCharts,
    toggleCharts,
    uiChartType,
    isFirstCopyOneTimeLink,
    setFirstCopyOneTimeLink,
  };
});
