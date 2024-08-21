export const useAuthStore = defineStore('Auth', () => {
  const requiresPassword = ref<boolean>(true);

  /**
   * @throws if unsuccessful
   */
  async function login(password: string) {
    const response = await api.createSession({ password });
    requiresPassword.value = response.requiresPassword;
    return true as const;
  }

  /**
   * @throws if unsuccessful
   */
  async function logout() {
    const response = await api.deleteSession();
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function update() {
    const session = await api.getSession();
    requiresPassword.value = session.requiresPassword;
  }

  return { requiresPassword, login, logout, update };
});
