import API from '@/services/api';
import { ref, reactive } from 'vue';

import { defineStore } from 'pinia';

const api = new API();

export const useStore = defineStore('store', () => {
  const authenticated = ref(null);
  const authenticating = ref(false);
  const password = ref(null);
  const requiresPassword = ref(null);

  const clients = ref(null);
  const clientsPersist = reactive({});
  const clientToDelete = ref(null);
  const clientCreateShowModal = ref(null);
  const clientCreateName = ref('');
  const qrcode = ref(null);

  function login(e) {
    e.preventDefault();

    if (!password.value) return;
    if (authenticating.value) return;

    authenticating.value = true;
    api
      .createSession({
        password: password.value,
      })
      .then(async () => {
        const session = await api.getSession();
        authenticated.value = session.authenticated;
        requiresPassword.value = session.requiresPassword;
        // return this.refresh();
      })
      .catch((err) => {
        console.log(err.message || err.toString());
      })
      .finally(() => {
        authenticating.value = false;
        password.value = null;
      });
  }

  function logout(e) {
    e.preventDefault();

    api
      .deleteSession()
      .then(() => {
        authenticated.value = false;
        clients.value = null;
      })
      .catch((err) => {
        alert(err.message || err.toString());
      });
  }

  function createClient() {
    if (!clientCreateName.value) return;

    api
      .createClient({ name: clientCreateName.value })
      .catch((err) => alert(err.message || err.toString()))
      .finally
      // () => refresh().catch(console.error)
      ();

    clientCreateShowModal.value = null;
  }

  function deleteClient(client) {
    api
      .deleteClient({ clientId: client.id })
      .catch((err) => alert(err.message || err.toString()))
      .finally
      // () => refresh().catch(console.error)
      ();

    clientToDelete.value = null;
  }

  return {
    authenticated,
    authenticating,
    password,
    requiresPassword,
    clients,
    clientsPersist,
    clientToDelete,
    clientCreateShowModal,
    clientCreateName,
    qrcode,
    login,
    logout,
    createClient,
    deleteClient,
  };
});
