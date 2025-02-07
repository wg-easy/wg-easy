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

  /**
   * @throws if unsuccessful
   */
  async function login(username: string, password: string, remember: boolean) {
    await $fetch('/api/session', {
      method: 'post',
      body: { username, password, remember },
    });
    return true as const;
  }

  /**
   * @throws if unsuccessful
   */
  async function logout() {
    const response = await $fetch('/api/session', {
      method: 'delete',
    });
    return response.success;
  }

  return { userData, login, logout, update, getSession };
});
