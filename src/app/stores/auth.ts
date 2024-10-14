export const useAuthStore = defineStore('Auth', () => {
  const userData = ref<null | {
    name: string;
    username: string;
    role: string;
    email: string | null;
  }>();

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
    const { data: response } = await api.getSession();
    userData.value = response.value;
  }

  return { userData, login, logout, update };
});
