import { defineStore } from 'pinia';

export const useModalStore = defineStore('Modal', () => {
  const clientsStore = useClientsStore();
  const clientCreate = ref<null | boolean>(null);
  const clientCreateName = ref<string>('');
  const clientExpireDate = ref<string>('');
  const qrcode = ref<null | string>(null);

  function createClient() {
    const name = clientCreateName.value;
    const expiresAt = clientExpireDate.value || null;
    if (!name) return;

    $fetch('/api/client', {
      method: 'post',
      body: { name, expiresAt },
    })
      .catch((err) => alert(err.message || err.toString()))
      .finally(() => clientsStore.refresh().catch(console.error));
  }

  return {
    clientCreate,
    clientCreateName,
    clientExpireDate,
    qrcode,
    createClient,
  };
});
