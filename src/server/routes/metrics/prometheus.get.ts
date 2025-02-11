export default defineMetricsHandler('prometheus', async ({ event }) => {
  setHeader(event, 'Content-Type', 'text/plain');
  return getPrometheusResponse();
});

async function getPrometheusResponse() {
  const wgInterface = await Database.interfaces.get();
  const clients = await WireGuard.getAllClients();
  let wireguardPeerCount = 0;
  let wireguardEnabledPeersCount = 0;
  let wireguardConnectedPeersCount = 0;
  const wireguardSentBytes = [];
  const wireguardReceivedBytes = [];
  const wireguardLatestHandshakeSeconds = [];
  for (const client of clients) {
    wireguardPeerCount++;
    if (client.enabled === true) {
      wireguardEnabledPeersCount++;
    }

    if (isPeerConnected(client)) {
      wireguardConnectedPeersCount++;
    }

    const id = `interface="${wgInterface.name}",enabled="${client.enabled}",ipv4Address="${client.ipv4Address}",ipv6Address="${client.ipv6Address}",name="${client.name}"`;

    wireguardSentBytes.push(
      `wireguard_sent_bytes{${id}} ${client.transferTx ?? 0}`
    );
    wireguardReceivedBytes.push(
      `wireguard_received_bytes{${id}} ${client.transferRx ?? 0}`
    );
    // TODO: if latestHandshakeAt is null this would result in client showing as online?
    wireguardLatestHandshakeSeconds.push(
      `wireguard_latest_handshake_seconds{${id}} ${client.latestHandshakeAt ? (Date.now() - client.latestHandshakeAt.getTime()) / 1000 : 0}`
    );
  }

  const id = `interface="${wgInterface.name}"`;

  const returnText = [
    '# HELP wg-easy and wireguard metrics',
    '',
    '# HELP wireguard_configured_peers',
    '# TYPE wireguard_configured_peers gauge',
    `wireguard_configured_peers{${id}} ${wireguardPeerCount}`,
    '',
    '# HELP wireguard_enabled_peers',
    '# TYPE wireguard_enabled_peers gauge',
    `wireguard_enabled_peers{${id}} ${wireguardEnabledPeersCount}`,
    '',
    '# HELP wireguard_connected_peers',
    '# TYPE wireguard_connected_peers gauge',
    `wireguard_connected_peers{${id}} ${wireguardConnectedPeersCount}`,
    '',
    '# HELP wireguard_sent_bytes Bytes sent to the peer',
    '# TYPE wireguard_sent_bytes counter',
    `${wireguardSentBytes.join('\n')}`,
    '',
    '# HELP wireguard_received_bytes Bytes received from the peer',
    '# TYPE wireguard_received_bytes counter',
    `${wireguardReceivedBytes.join('\n')}`,
    '',
    '# HELP wireguard_latest_handshake_seconds UNIX timestamp seconds of the last handshake',
    '# TYPE wireguard_latest_handshake_seconds gauge',
    `${wireguardLatestHandshakeSeconds.join('\n')}`,
  ];

  return returnText.join('\n');
}
