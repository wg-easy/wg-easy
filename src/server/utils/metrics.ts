// TODO: rewrite

export async function getPrometheusResponse() {
  const clients = await WireGuard.getClients();
  let wireguardPeerCount = 0;
  let wireguardEnabledPeersCount = 0;
  let wireguardConnectedPeersCount = 0;
  let wireguardSentBytes = '';
  let wireguardReceivedBytes = '';
  let wireguardLatestHandshakeSeconds = '';
  for (const client of clients) {
    wireguardPeerCount++;
    if (client.enabled === true) {
      wireguardEnabledPeersCount++;
    }
    if (client.endpoint !== null) {
      wireguardConnectedPeersCount++;
    }
    wireguardSentBytes += `wireguard_sent_bytes{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${Number(client.transferTx)}\n`;
    wireguardReceivedBytes += `wireguard_received_bytes{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${Number(client.transferRx)}\n`;
    wireguardLatestHandshakeSeconds += `wireguard_latest_handshake_seconds{interface="wg0",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"} ${client.latestHandshakeAt ? (new Date().getTime() - new Date(client.latestHandshakeAt).getTime()) / 1000 : 0}\n`;
  }

  let returnText = '# HELP wg-easy and wireguard metrics\n';

  returnText += '\n# HELP wireguard_configured_peers\n';
  returnText += '# TYPE wireguard_configured_peers gauge\n';
  returnText += `wireguard_configured_peers{interface="wg0"} ${wireguardPeerCount}\n`;

  returnText += '\n# HELP wireguard_enabled_peers\n';
  returnText += '# TYPE wireguard_enabled_peers gauge\n';
  returnText += `wireguard_enabled_peers{interface="wg0"} ${wireguardEnabledPeersCount}\n`;

  returnText += '\n# HELP wireguard_connected_peers\n';
  returnText += '# TYPE wireguard_connected_peers gauge\n';
  returnText += `wireguard_connected_peers{interface="wg0"} ${wireguardConnectedPeersCount}\n`;

  returnText += '\n# HELP wireguard_sent_bytes Bytes sent to the peer\n';
  returnText += '# TYPE wireguard_sent_bytes counter\n';
  returnText += `${wireguardSentBytes}`;

  returnText +=
    '\n# HELP wireguard_received_bytes Bytes received from the peer\n';
  returnText += '# TYPE wireguard_received_bytes counter\n';
  returnText += `${wireguardReceivedBytes}`;

  returnText +=
    '\n# HELP wireguard_latest_handshake_seconds UNIX timestamp seconds of the last handshake\n';
  returnText += '# TYPE wireguard_latest_handshake_seconds gauge\n';
  returnText += `${wireguardLatestHandshakeSeconds}`;

  return returnText;
}

export async function getMetricsJSON() {
  const clients = await WireGuard.getClients();
  let wireguardPeerCount = 0;
  let wireguardEnabledPeersCount = 0;
  let wireguardConnectedPeersCount = 0;
  for (const client of clients) {
    wireguardPeerCount++;
    if (client.enabled === true) {
      wireguardEnabledPeersCount++;
    }
    if (client.endpoint !== null) {
      wireguardConnectedPeersCount++;
    }
  }
  return {
    wireguard_configured_peers: wireguardPeerCount,
    wireguard_enabled_peers: wireguardEnabledPeersCount,
    wireguard_connected_peers: wireguardConnectedPeersCount,
  };
}
