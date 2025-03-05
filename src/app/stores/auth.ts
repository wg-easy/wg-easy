export const useAuthStore = defineStore('Auth', () => {
  const { data: userData, refresh: update } = useFetch('/api/session', {
    method: 'get',
  });

  async function getSession() {
    try {
      const { data } = await useFetch('/api/session', {
        method: 'get',
      });
      return data.value;
    } catch {
      return null;
    }
  }

  return { userData, update, getSession };
});
