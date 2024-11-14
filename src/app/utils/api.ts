class API {
  async getSession() {
    return useFetch('/api/session', {
      method: 'get',
    });
  }

  async createSession({
    username,
    password,
    remember,
  }: {
    username: string;
    password: string | null;
    remember: boolean;
  }) {
    return $fetch('/api/session', {
      method: 'post',
      body: { username, password, remember },
    });
  }

  async deleteSession() {
    return $fetch('/api/session', {
      method: 'delete',
    });
  }

  async getClients() {
    return useFetch('/api/client', {
      method: 'get',
    });
  }

  async createClient({
    name,
    expireDate,
  }: {
    name: string;
    expireDate: string | null;
  }) {
    return $fetch('/api/client', {
      method: 'post',
      body: { name, expireDate },
    });
  }

  async deleteClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/client/${clientId}`, {
      method: 'delete',
    });
  }

  async showOneTimeLink({ clientId }: { clientId: string }) {
    return $fetch(`/api/client/${clientId}/generateOneTimeLink`, {
      method: 'post',
    });
  }

  async updateClientExpireDate({
    clientId,
    expireDate,
  }: {
    clientId: string;
    expireDate: string | null;
  }) {
    return $fetch(`/api/client/${clientId}/expireDate`, {
      method: 'put',
      body: { expireDate },
    });
  }

  async restoreConfiguration(file: string) {
    return $fetch('/api/wireguard/restore', {
      method: 'put',
      body: { file },
    });
  }
}

type WGClientReturn = Awaited<
  ReturnType<typeof API.prototype.getClients>
>['data']['value'];

export type WGClient = WGClientReturn extends (infer U)[] | undefined
  ? U
  : never;

export default new API();
