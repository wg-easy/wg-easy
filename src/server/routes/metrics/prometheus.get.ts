import { setHeader } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { defineMetricsHandler } from '#server/utils/handler';
import { formatPrometheusLabels } from '#server/utils/prometheus';
import { quotaFirewall } from '#server/utils/quotaFirewall';
import { isPeerConnected } from '#shared/utils/time';

export default defineMetricsHandler('prometheus', async ({ event }) => {
  setHeader(event, 'Content-Type', 'text/plain');
  return getPrometheusResponse();
});

async function getPrometheusResponse() {
  const wgInterface = await Database.interfaces.get();
  const [clients, quotas] = await Promise.all([
    WireGuard.getAllClients(),
    Database.quotas.getAll(),
  ]);
  let wireguardEnabledPeersCount = 0;
  let wireguardConnectedPeersCount = 0;
  const wireguardSentBytes = [];
  const wireguardReceivedBytes = [];
  const wireguardLatestHandshakeSeconds = [];
  for (const client of clients) {
    if (client.enabled === true) {
      wireguardEnabledPeersCount++;
    }

    if (isPeerConnected(client)) {
      wireguardConnectedPeersCount++;
    }

    const id = formatPrometheusLabels({
      interface: wgInterface.name,
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
    // TODO: if latestHandshakeAt is null this would result in client showing as online?
    wireguardLatestHandshakeSeconds.push(
      `wireguard_latest_handshake_seconds{${id}} ${client.latestHandshakeAt ? (Date.now() - client.latestHandshakeAt.getTime()) / 1000 : 0}`
    );
  }

  const id = formatPrometheusLabels({ interface: wgInterface.name });
  const quotaInfo = [];
  const quotaReceivedBytes = [];
  const quotaSentBytes = [];
  const quotaLimits = [];
  for (const quota of quotas) {
    const quotaId = formatPrometheusLabels({ quota_id: quota.id });
    quotaInfo.push(
      `wireguard_quota_info{${formatPrometheusLabels({
        quota_id: quota.id,
        mode: quota.limit.mode,
        enabled: quota.enabled,
        exceeded: quota.exceededAt !== null,
      })}} 1`
    );
    quotaReceivedBytes.push(
      `wireguard_quota_received_bytes{${quotaId}} ${quota.usedRxBytes}`
    );
    quotaSentBytes.push(
      `wireguard_quota_sent_bytes{${quotaId}} ${quota.usedTxBytes}`
    );
    if (quota.limit.mode === 'RX' || quota.limit.mode === 'SEPARATE') {
      quotaLimits.push(
        `wireguard_quota_limit_bytes{${formatPrometheusLabels({ quota_id: quota.id, direction: 'rx' })}} ${quota.limit.rxBytes}`
      );
    }
    if (quota.limit.mode === 'TX' || quota.limit.mode === 'SEPARATE') {
      quotaLimits.push(
        `wireguard_quota_limit_bytes{${formatPrometheusLabels({ quota_id: quota.id, direction: 'tx' })}} ${quota.limit.txBytes}`
      );
    }
    if (quota.limit.mode === 'TOTAL') {
      quotaLimits.push(
        `wireguard_quota_limit_bytes{${formatPrometheusLabels({ quota_id: quota.id, direction: 'total' })}} ${quota.limit.totalBytes}`
      );
    }
  }

  const returnText = [
    '# HELP wireguard_configured_peers',
    '# TYPE wireguard_configured_peers gauge',
    `wireguard_configured_peers{${id}} ${clients.length}`,
    '',
    '# HELP wireguard_enabled_peers',
    '# TYPE wireguard_enabled_peers gauge',
    `wireguard_enabled_peers{${id}} ${wireguardEnabledPeersCount}`,
    '',
    '# HELP wireguard_connected_peers',
    '# TYPE wireguard_connected_peers gauge',
    `wireguard_connected_peers{${id}} ${wireguardConnectedPeersCount}`,
    '',
    '# HELP wireguard_quota_backend_info Active quota enforcement backend',
    '# TYPE wireguard_quota_backend_info gauge',
    `wireguard_quota_backend_info{${formatPrometheusLabels({ backend: quotaFirewall.backend })}} 1`,
    '',
    '# HELP wireguard_quota_info Quota configuration and enforcement state',
    '# TYPE wireguard_quota_info gauge',
    `${quotaInfo.join('\n')}`,
    '',
    '# HELP wireguard_quota_received_bytes Bytes received in the current quota period',
    '# TYPE wireguard_quota_received_bytes gauge',
    `${quotaReceivedBytes.join('\n')}`,
    '',
    '# HELP wireguard_quota_sent_bytes Bytes sent in the current quota period',
    '# TYPE wireguard_quota_sent_bytes gauge',
    `${quotaSentBytes.join('\n')}`,
    '',
    '# HELP wireguard_quota_limit_bytes Configured quota limit in bytes',
    '# TYPE wireguard_quota_limit_bytes gauge',
    `${quotaLimits.join('\n')}`,
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
    '',
  ];

  return returnText.join('\n');
}
