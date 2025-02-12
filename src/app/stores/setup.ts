import { defineStore } from 'pinia';

export const useSetupStore = defineStore('Setup', () => {
  /**
   * @throws if unsuccessful
   */
  async function step2(username: string, password: string, accept: boolean) {
    const response = await $fetch('/api/setup/2', {
      method: 'post',
      body: { username, password, accept },
    });
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function step4(host: string, port: number) {
    const response = await $fetch('/api/setup/4', {
      method: 'post',
      body: { host, port },
    });
    return response.success;
  }

  /**
   * @throws if unsuccessful
   */
  async function runMigration(file: string) {
    const response = await $fetch('/api/setup/migrate', {
      method: 'post',
      body: { file },
    });
    return response.success;
  }

  const step = ref(1);
  const totalSteps = ref(5);
  function setStep(i: number) {
    step.value = i;
  }

  return {
    step2,
    step4,
    runMigration,
    step,
    totalSteps,
    setStep,
  };
});
