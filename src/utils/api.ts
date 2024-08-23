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

  async getSession() {
    // TODO?: use useFetch
    return $fetch('/api/session', {
      method: 'get',
    });
  }

  async createSession({ password }: { password: string | null }) {
    return $fetch('/api/session', {
      method: 'post',
      body: { password },
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

  async createClient({ name }: { name: string }) {
    return $fetch('/api/wireguard/client', {
      method: 'POST',
      body: { name },
    });
  }

  async deleteClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}`, {
      method: 'DELETE',
    });
  }

  async enableClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}/enable`, {
      method: 'POST',
    });
  }

  async disableClient({ clientId }: { clientId: string }) {
    return $fetch(`/api/wireguard/client/${clientId}/disable`, {
      method: 'POST',
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
      method: 'PUT',
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
      method: 'PUT',
      body: { address },
    });
  }

  async restoreConfiguration(file: string) {
    return $fetch('/api/wireguard/restore', {
      method: 'PUT',
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
