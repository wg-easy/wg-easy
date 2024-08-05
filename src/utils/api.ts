class API {
  async getRelease() {
    return $fetch('/api/release', {
      method: 'get',
    });
  }

  async getLang() {
    return $fetch('/api/lang', {
      method: 'get',
    });
  }

  async getUITrafficStats() {
    return $fetch('/api/ui-traffic-stats', {
      method: 'get',
    });
  }

  async getChartType() {
    return $fetch('/api/ui-chart-type', {
      method: 'get',
    });
  }

  async getSession() {
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
    return $fetch('/api/wireguard/client', {
      method: 'get',
    }).then((clients) =>
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

export default new API();
