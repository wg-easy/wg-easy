export const useAuthStore = defineStore('Auth', () => {
  const requiresPassword = ref<boolean>(true);

  /**
   * @throws if unsuccessful
   */
  async function signup(username: string, password: string) {
    const response = await api.setupAccount({ username, password });
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function login(username: string, password: string, remember: boolean) {
    const response = await api.createSession({ username, password, remember });
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

  return { requiresPassword, login, logout, update, signup };
});
