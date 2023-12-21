/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';

class API {

  async call({ method, path, body }) {
    const res = await fetch(`./api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || res.statusText);
    }

    return json;
  }

  async getRelease() {
    return this.call({
      method: 'get',
      path: '/release',
    });
  }

  async getSession() {
    return this.call({
      method: 'get',
      path: '/session',
    });
  }

  async createSession({ password }) {
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
    }).then((clients) => clients.map((client) => ({
      ...client,
      createdAt: new Date(client.createdAt),
      updatedAt: new Date(client.updatedAt),
      latestHandshakeAt: client.latestHandshakeAt !== null
        ? new Date(client.latestHandshakeAt)
        : null,
    })));
  }

  async createClient({ name }) {
    return this.call({
      method: 'post',
      path: '/wireguard/client',
      body: { name },
    });
  }

  async deleteClient({ clientId }) {
    return this.call({
      method: 'delete',
      path: `/wireguard/client/${clientId}`,
    });
  }

  async enableClient({ clientId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/enable`,
    });
  }

  async disableClient({ clientId }) {
    return this.call({
      method: 'post',
      path: `/wireguard/client/${clientId}/disable`,
    });
  }

  async updateClientName({ clientId, name }) {
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/name/`,
      body: { name },
    });
  }

  async updateClientAddress({ clientId, address }) {
    return this.call({
      method: 'put',
      path: `/wireguard/client/${clientId}/address/`,
      body: { address },
    });
  }

}
