export type APIClient = {
  id: string;
  name: string;
  enabled: boolean;
  address: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
  downloadableConfig: boolean;
  persistentKeepalive: string;
  latestHandshakeAt: null;
  transferRx: number;
  transferTx: number;
};

class API {
  async call({
    method,
    path,
    body,
  }: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
  }) {
    const res = await fetch(`./api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || res.statusText);
    }

    return json;
  }

  async getRelease() {
    return this.call({
      method: 'get',
      path: '/release',
    });
  }

  async getLang() {
    return this.call({
      method: 'get',
      path: '/lang',
    });
  }

  async getuiTrafficStats() {
    return this.call({
      method: 'get',
      path: '/ui-traffic-stats',
    });
  }

  async getChartType() {
    return this.call({
      method: 'get',
      path: '/ui-chart-type',
    });
  }

  async getSession() {
    return this.call({
      method: 'get',
      path: '/session',
    });
  }

  async createSession({ password }: { password: string | null }) {
    return this.call({
      method: 'post',
      path: '/session',
      body: { password },
    });
  }

  async deleteSession() {
    return this.call({
      method: 'delete',
      path: '/session',
    });
  }

  async getClients() {
    return this.call({
      method: 'get',
      path: '/wireguard/client',
    }).then((clients: APIClient[]) =>
      clients.map((client) => ({
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
        latestHandshakeAt:
          client.latestHandshakeAt !== null
            ? new Date(client.latestHandshakeAt)
            : null,
      }))
    );
  }

  async createClient({ name }: { name: string }) {
    return this.call({
      method: 'post',
      path: '/wireguard/client',
      body: { name },
    });
  }

  async deleteClient({ clientId }: { clientId: string }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/client/${clientId}`,
    });
  }

  async enableClient({ clientId }: { clientId: string }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/enable`,
    });
  }

  async disableClient({ clientId }: { clientId: string }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/disable`,
    });
  }

  async updateClientName({
    clientId,
    name,
  }: {
    clientId: string;
    name: string;
  }) {
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/name/`,
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
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/address/`,
      body: { address },
    });
  }

  async restoreConfiguration(file: string) {
    return this.call({
      method: 'put',
      path: '/wireguard/restore',
      body: { file },
    });
  }
}

export default new API();
