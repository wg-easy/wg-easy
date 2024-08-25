class API {
  async getRelease() {
    return useFetch('/api/release', {
      method: 'get',
    });
  }

  async getLang() {
    return useFetch('/api/lang', {
      method: 'get',
    });
  }

  async getRememberMeEnabled() {
    return useFetch('/api/remember-me', {
      method: 'get',
    });
  }

  async getTrafficStats() {
    return useFetch('/api/ui-traffic-stats', {
      method: 'get',
    });
  }

  async getChartType() {
    return useFetch('/api/ui-chart-type', {
      method: 'get',
    });
  }

  async getEnableOneTimeLinks() {
    return useFetch('/api/wg-enable-one-time-links', {
      method: 'get',
    });
  }

  async getEnableExpireTime() {
    return useFetch('/api/wg-enable-expire-time', {
      method: 'get',
    });
  }

  async getSession() {
    // TODO?: use useFetch
    return $fetch('/api/session', {
      method: 'get',
    });
  }

  async createSession({
    password,
    remember,
  }: {
    password: string | null;
    remember: boolean;
  }) {
    return $fetch('/api/session', {
      method: 'post',
      body: { password, remember },
    });
  }

  async deleteSession() {
    return $fetch('/api/session', {
      method: 'delete',
    });
  }

  async getClients() {
    return useFetch('/api/wireguard/client', {
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
    return $fetch('/api/wireguard/client', {
      method: 'post',
      body: { name, expireDate },
    });
  }

  async deleteClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}`, {
      method: 'delete',
    });
  }

  async showOneTimeLink({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}/generateOneTimeLink`, {
      method: 'post',
    });
  }

  async enableClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}/enable`, {
      method: 'post',
    });
  }

  async disableClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}/disable`, {
      method: 'post',
    });
  }

  async updateClientName({
    clientId,
    name,
  }: {
    clientId: string;
    name: string;
  }) {
    return $fetch(`/api/wireguard/client/${clientId}/name`, {
      method: 'put',
      body: { name },
    });
  }

  async updateClientAddress({
    clientId,
    address,
  }: {
    clientId: string;
    address: string;
  }) {
    return $fetch(`/api/wireguard/client/${clientId}/address`, {
      method: 'put',
      body: { address },
    });
  }

  async updateClientExpireDate({
    clientId,
    expireDate,
  }: {
    clientId: string;
    expireDate: string | null;
  }) {
    return $fetch(`/api/wireguard/client/${clientId}/expireDate`, {
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

  async getSortClients() {
    return useFetch('/api/ui-sort-clients', {
      method: 'get',
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
