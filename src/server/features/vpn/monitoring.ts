import { getDatabase } from '#db';
import { wg } from '#server/utils/wgHelper';
import { mergeClientStatuses } from '#server/utils/clientStatus';
import { isPeerConnected } from '#shared/utils/time';

async function read() {
  const { network, clients } = await getDatabase().transaction(async (tx) => ({
    network: await tx.interfaces.get(),
    clients: await tx.clients.getAllPublic(),
  }));
  const peers = await wg.dump(network.name);
  const now = Date.now();
  const status = mergeClientStatuses(clients, peers);
  return {
    interfaceName: network.name,
    clients: status,
    now,
    counts: {
      wireguard_configured_peers: status.length,
      wireguard_enabled_peers: status.filter((client) => client.enabled).length,
      wireguard_connected_peers: status.filter((client) =>
        isPeerConnected(client, now)
      ).length,
    },
  };
}

export async function json() {
  const { clients, counts } = await read();
  return {
    ...counts,
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

export async function prometheus() {
  const { interfaceName, clients, counts, now } = await read();
  const wireguardSentBytes = [];
  const wireguardReceivedBytes = [];
  const wireguardLatestHandshakeSeconds = [];
  const wireguardEndpointInfo = [];
  for (const client of clients) {
    const id = formatPrometheusLabels({
      interface: interfaceName,
      enabled: client.enabled,
      ipv4Address: client.ipv4Address,
      ipv6Address: client.ipv6Address,
      name: client.name,
    });

    wireguardSentBytes.push(
      `wireguard_sent_bytes{${id}} ${client.transferTx ?? 0}`
    );
    wireguardReceivedBytes.push(
      `wireguard_received_bytes{${id}} ${client.transferRx ?? 0}`
    );
    wireguardLatestHandshakeSeconds.push(
      `wireguard_latest_handshake_seconds{${id}} ${client.latestHandshakeAt ? (now - client.latestHandshakeAt.getTime()) / 1000 : 0}`
    );

    if (client.endpoint) {
      const endpointId = formatPrometheusLabels({
        interface: interfaceName,
        name: client.name,
        endpoint: client.endpoint,
      });
      wireguardEndpointInfo.push(
        `wireguard_peer_endpoint_info{${endpointId}} 1`
      );
    }
  }

  const id = formatPrometheusLabels({ interface: interfaceName });

  const returnText = [
    '# HELP wireguard_configured_peers',
    '# TYPE wireguard_configured_peers gauge',
    `wireguard_configured_peers{${id}} ${counts.wireguard_configured_peers}`,
    '',
    '# HELP wireguard_enabled_peers',
    '# TYPE wireguard_enabled_peers gauge',
    `wireguard_enabled_peers{${id}} ${counts.wireguard_enabled_peers}`,
    '',
    '# HELP wireguard_connected_peers',
    '# TYPE wireguard_connected_peers gauge',
    `wireguard_connected_peers{${id}} ${counts.wireguard_connected_peers}`,
    '',
    '# HELP wireguard_sent_bytes Bytes sent to the peer',
    '# TYPE wireguard_sent_bytes counter',
    `${wireguardSentBytes.join('\n')}`,
    '',
    '# HELP wireguard_received_bytes Bytes received from the peer',
    '# TYPE wireguard_received_bytes counter',
    `${wireguardReceivedBytes.join('\n')}`,
    '',
    '# HELP wireguard_latest_handshake_seconds Seconds since the last handshake; 0 when no handshake is available',
    '# TYPE wireguard_latest_handshake_seconds gauge',
    `${wireguardLatestHandshakeSeconds.join('\n')}`,
    '',
    '# HELP wireguard_peer_endpoint_info Current endpoint (IP:port) of a connected peer',
    '# TYPE wireguard_peer_endpoint_info gauge',
    `${wireguardEndpointInfo.join('\n')}`,
    '',
  ];

  return returnText.join('\n');
}

function escapePrometheusLabelValue(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('"', '\\"');
}

function formatPrometheusLabels(
  labels: Record<string, string | number | boolean>
): string {
  return Object.entries(labels)
    .map(
      ([name, value]) =>
        `${name}="${escapePrometheusLabelValue(String(value))}"`
    )
    .join(',');
}
