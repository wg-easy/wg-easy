import WireGuard from '#server/utils/WireGuard';
import Database from '#server/utils/Database';
import { defineMetricsHandler } from '#server/utils/handler';
import { quotaFirewall } from '#server/utils/quotaFirewall';
import { isPeerConnected } from '#shared/utils/time';

export default defineMetricsHandler('json', async () => {
  return getMetricsJSON();
});

async function getMetricsJSON() {
  const [clients, quotas] = await Promise.all([
    WireGuard.getAllClients(),
    Database.quotas.getAll(),
  ]);
  let wireguardPeerCount = 0;
  let wireguardEnabledPeersCount = 0;
  let wireguardConnectedPeersCount = 0;
  for (const client of clients) {
    wireguardPeerCount++;
    if (client.enabled === true) {
      wireguardEnabledPeersCount++;
    }
    if (isPeerConnected(client)) {
      wireguardConnectedPeersCount++;
    }
  }
  return {
    wireguard_configured_peers: wireguardPeerCount,
    wireguard_enabled_peers: wireguardEnabledPeersCount,
    wireguard_connected_peers: wireguardConnectedPeersCount,
    quota_enforcement_backend: quotaFirewall.backend,
    quotas,
    clients: clients.map((client) => ({
      name: client.name,
      enabled: client.enabled,
      ipv4Address: client.ipv4Address,
      ipv6Address: client.ipv6Address,
      publicKey: client.publicKey,
      endpoint: client.endpoint,
      latestHandshakeAt: client.latestHandshakeAt,
      transferRx: client.transferRx,
      transferTx: client.transferTx,
    })),
  };
}
