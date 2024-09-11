export const useAuthStore = defineStore('Auth', () => {
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
    await api.createSession({ username, password, remember });
    return true as const;
  }

  /**
   * @throws if unsuccessful
   */
  async function logout() {
    const response = await api.deleteSession();
    return response.success;
  }

  async function update() {
    // store role etc
    await api.getSession();
  }

  return { login, logout, update, signup };
});
