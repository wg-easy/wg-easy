import { defineStore } from 'pinia';

export const useSetupStore = defineStore('Setup', () => {
  /**
   * @throws if unsuccessful
   */
  async function signup(username: string, password: string, accept: boolean) {
    const response = await api.setupAdminUser({ username, password, accept });
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function updateHostPort(host: string, port: number) {
    const response = await api.setupHostPort({ host, port });
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function runMigration(file: string) {
    const response = await api.setupMigration({ file });
    return response.success;
  }

  return { signup, updateHostPort, runMigration };
});
