import { ref, computed } from 'vue';
import sha256 from 'crypto-js/sha256';

import { defineStore } from 'pinia';

import api from '@/services/apiInstance';

export const useStore = defineStore('store', () => {
  const authenticated = ref(null);
  const authenticating = ref(false);
  const password = ref(null);
  const requiresPassword = ref(null);

  const clients = ref(null);
  const clientsPersist = ref({});
  const clientToDelete = ref(null);
  const clientCreateShowModal = ref(null);
  const clientCreateName = ref('');
  const qrcode = ref(null);
  const lang = ref('en');
  const dateFnsLocale = ref();

  const uiTheme = ref(localStorage.theme || 'auto');
  const prefersDarkScheme = ref(window.matchMedia('(prefers-color-scheme: dark)'));

  const uiChartType = ref(0);
  const uiShowCharts = ref(localStorage.getItem('uiShowCharts') === '1');
  const uiTrafficStats = ref(false);

  const pauseCharts = ref(false);

  const updateCharts = computed(() => {
    return uiChartType.value > 0 && uiShowCharts.value;
  });

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
        return refresh();
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
      .finally(() => refresh().catch(console.error));

    clientCreateShowModal.value = null;
  }

  function deleteClient(client) {
    api
      .deleteClient({ clientId: client.id })
      .catch((err) => alert(err.message || err.toString()))
      .finally(() => refresh().catch(console.error));

    clientToDelete.value = null;
  }

  async function refresh() {
    if (!authenticated.value) return;

    try {
      const clientsData = await api.getClients();
      clients.value = clientsData.map((client) => {
        if (client.name.includes('@') && client.name.includes('.')) {
          client.avatar = `https://www.gravatar.com/avatar/${sha256(client.name)}?d=blank`;
        }

        if (!clientsPersist[client.id]) {
          clientsPersist[client.id] = {};
          clientsPersist[client.id].transferRxHistory = Array(50).fill(0);
          clientsPersist[client.id].transferRxPrevious = client.transferRx;
          clientsPersist[client.id].transferTxHistory = Array(50).fill(0);
          clientsPersist[client.id].transferTxPrevious = client.transferTx;
        }

        // Debug
        if (api.isDev) {
          client.transferRx = clientsPersist[client.id].transferRxPrevious + Math.random() * 1000;
          client.transferTx = clientsPersist[client.id].transferTxPrevious + Math.random() * 1000;
          client.latestHandshakeAt = new Date('2024-03-20');
        }

        if (updateCharts.value && !pauseCharts.value) {
          clientsPersist[client.id].transferRxHistory.push(clientsPersist[client.id].transferRxCurrent);
          clientsPersist[client.id].transferRxHistory.shift();

          clientsPersist[client.id].transferTxHistory.push(clientsPersist[client.id].transferTxCurrent);
          clientsPersist[client.id].transferTxHistory.shift();
        }

        clientsPersist[client.id].transferRxCurrent = client.transferRx - clientsPersist[client.id].transferRxPrevious;
        clientsPersist[client.id].transferRxPrevious = client.transferRx;
        clientsPersist[client.id].transferTxCurrent = client.transferTx - clientsPersist[client.id].transferTxPrevious;
        clientsPersist[client.id].transferTxPrevious = client.transferTx;

        client.transferTxCurrent = clientsPersist[client.id].transferTxCurrent;
        client.transferRxCurrent = clientsPersist[client.id].transferRxCurrent;

        client.transferTxHistory = clientsPersist[client.id].transferTxHistory;
        client.transferRxHistory = clientsPersist[client.id].transferRxHistory;
        client.transferMax = Math.max(...client.transferTxHistory, ...client.transferRxHistory);

        client.hoverTx = clientsPersist[client.id].hoverTx;
        client.hoverRx = clientsPersist[client.id].hoverRx;

        return client;
      });
    } catch (error) {
      console.log('Something went wrong', error);
    }
  }

  function toggleTheme() {
    pauseCharts.value = true;

    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(uiTheme.value);
    const newIndex = (currentIndex + 1) % themes.length;
    uiTheme.value = themes[newIndex];
    localStorage.theme = uiTheme.value;
    setTheme(uiTheme.value);
    
    setTimeout(() => {
      pauseCharts.value = false;
    }, 300);
  }
  function setTheme(theme) {
    const { classList } = document.documentElement;
    const shouldAddDarkClass = theme === 'dark' || (theme === 'auto' && prefersDarkScheme.value.matches);
    classList.toggle('dark', shouldAddDarkClass);
  }

  function handlePrefersChange(e) {
    if (localStorage.theme === 'auto') {
      setTheme(e.matches ? 'dark' : 'light');
    }
  }

  function toggleCharts() {
    localStorage.setItem('uiShowCharts', uiShowCharts.value ? 1 : 0);
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
    uiTheme,
    prefersDarkScheme,
    lang,
    dateFnsLocale,
    uiChartType,
    uiShowCharts,
    uiTrafficStats,
    updateCharts,
    login,
    logout,
    createClient,
    deleteClient,
    refresh,
    toggleTheme,
    setTheme,
    handlePrefersChange,
    toggleCharts,
  };
});
