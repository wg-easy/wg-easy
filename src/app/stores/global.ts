export const useGlobalStore = defineStore('Global', () => {
  const { data: information, refresh: refreshInformation } = useFetch(
    '/api/information',
    {
      method: 'get',
    }
  );

  const uiShowCharts = useCookie<boolean>('uiShowCharts', {
    default: () => false,
    maxAge: 365 * 24 * 60 * 60,
  });

  function toggleCharts() {
    uiShowCharts.value = !uiShowCharts.value;
  }

  return {
    information,
    refreshInformation,
    uiShowCharts,
    toggleCharts,
  };
});
