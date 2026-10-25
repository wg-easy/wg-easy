import type { H3Event } from 'h3';

export const useAuthStore = defineStore('Auth', () => {
  const userData = useState<SharedPublicUser | null>('user-data', () => null);

  async function getSession(event?: H3Event) {
    try {
      if (event?.$fetch) {
        return await event.$fetch('/api/session', {
          method: 'get',
        });
      }

      return await $fetch('/api/session', {
        method: 'get',
      });
    } catch {
      return null;
    }
  }

  async function update() {
    const data = await getSession();
    userData.value = data;
  }

  return { userData, update, getSession };
});
