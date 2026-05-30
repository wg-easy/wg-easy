import type { H3Event } from 'h3';
import type { SharedPublicUser } from '~~/shared/utils/permissions';

type SessionFetch = (
  request: string,
  options: { method: 'get' }
) => Promise<SharedPublicUser | null>;

export const useAuthStore = defineStore('Auth', () => {
  const userData = useState<SharedPublicUser | null>('user-data', () => null);

  async function getSession(event?: H3Event) {
    let fetch = $fetch as unknown as SessionFetch;
    if (event) {
      fetch = event.$fetch as unknown as SessionFetch;
    }

    try {
      const data = await fetch('/api/session', {
        method: 'get',
      });
      return data;
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
