import { defineStore } from 'pinia';

export const useSetupStore = defineStore('Setup', () => {
  const step = ref(1);
  const done = ref(false);
  return { step, done };
});
