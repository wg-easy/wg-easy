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

  type SetupError = {
    title: string;
    message: string;
  };

  const error = ref<null | SetupError>(null);

  function handleError(e: SetupError) {
    error.value = e;
  }

  const step = ref(1);
  const totalSteps = ref(6);
  function setStep(i: number) {
    step.value = i;
  }

  return {
    signup,
    updateHostPort,
    runMigration,
    error,
    handleError,
    step,
    totalSteps,
    setStep,
  };
});
