import { defineStore } from 'pinia';

export const useSetupStore = defineStore('Setup', () => {
  const step = ref(1);
  const totalSteps = ref(5);
  function setStep(i: number) {
    step.value = i;
  }

  return {
    step,
    totalSteps,
    setStep,
  };
});
