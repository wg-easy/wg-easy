import { ref, watch } from 'vue';

export function useClientEnabled(getClientEnabled: () => boolean) {
  const enabled = ref(getClientEnabled());

  watch(getClientEnabled, (value) => {
    enabled.value = value;
  });

  return enabled;
}
