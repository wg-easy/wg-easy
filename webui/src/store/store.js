import API from '@/services/api';
import { ref } from 'vue';

import { defineStore } from 'pinia';

const api = new API();

export const useStore = defineStore('store', () => {
  const authenticated = ref(null);
  const authenticating = ref(false);
  const password = ref(null);

  function login(e) {
    e.preventDefault();

    if (!password.value) return;
    if (authenticating.value) return;

    authenticating.value = true;
    api
      .createSession({
        password: password,
      })
      .then(async () => {
        const session = await api.getSession();
        authenticated.value = session.authenticated;
        requiresPassword.value = session.requiresPassword;
        return this.refresh();
      })
      .catch((err) => {
        alert(err.message || err.toString());
      })
      .finally(() => {
        this.authenticating = false;
        this.password = null;
      });
  }

  return {
    authenticated,
    authenticating,
    login,
    password,
  };
});
