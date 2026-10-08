export const useGlobalStore = defineStore('Global', () => {
  const { data: information, refresh: refreshInformation } = useFetch(
    '/api/information',
    {
      method: 'get',
    }
  );

  const supportsAwg3 = computed(
    () => information.value?.awgProtocolVersion !== '2.0'
  );
  const supportsAwg31 = computed(
    () =>
      !information.value?.awgProtocolVersion ||
      information.value.awgProtocolVersion === '3.1'
  );

  const sortClient = ref<'asc' | 'desc'>('asc');

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
    supportsAwg3,
    supportsAwg31,
    information,
    refreshInformation,
    uiShowCharts,
    toggleCharts,
    uiChartType,
  };
});
