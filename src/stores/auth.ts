export const useAuthStore = defineStore('Auth', () => {
  const authenticated = ref<boolean>(false);
  const requiresPassword = ref<boolean>(true);

  /**
   * @throws if unsuccessful
   */
  async function login(password: string) {
    const response = await api.createSession({ password });
    authenticated.value = response.success;
    requiresPassword.value = response.requiresPassword;
    return true as const;
  }

  /**
   * @throws if unsuccessful
   */
  async function logout() {
    const response = await api.deleteSession();
    authenticated.value = !response.success;
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function update() {
    const response = await api.getSession();
    authenticated.value = response.authenticated;
    requiresPassword.value = response.requiresPassword;
  }

  return { requiresPassword, authenticated, login, logout, update };
});
