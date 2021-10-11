'use strict';

const client = require('prom-client');

const { collectDefaultMetrics } = client;
collectDefaultMetrics({ prefix: 'wg_easy_' });

const sentBytesTotal = new client.Counter({
  name: 'wireguard_sent_bytes_total',
  help: 'Bytes sent to the peer',
  labelNames: ['interface', 'public_key', 'allowed_ips', 'friendly_name', 'enabled'],
});

const reveivedBytesTotal = new client.Counter({
  name: 'wireguard_received_bytes_total',
  help: 'Bytes received from the peer',
  labelNames: ['interface', 'public_key', 'allowed_ips', 'friendly_name', 'enabled'],
});

const latestHandshakeSeconds = new client.Gauge({
  name: 'wireguard_latest_handshake_seconds',
  help: 'Seconds from the last handshake',
  labelNames: ['interface', 'public_key', 'allowed_ips', 'friendly_name', 'enabled'],
});

const persistentKeepaliveSeconds = new client.Gauge({
  name: 'wireguard_persistent_keepalive_seconds',
  help: 'Seconds between each persistent keepalive packet',
  labelNames: ['interface', 'public_key', 'allowed_ips', 'friendly_name', 'enabled'],
});

module.exports = class Metrics {

  async getMetrics(wgClients) {
    if (!wgClients) {
      return client.register.metrics();
    }

    for (const wgClient of wgClients) {
      const labels = {
        interface: wgClient.interface,
        public_key: wgClient.publicKey,
        allowed_ips: wgClient.allowedIPs,
        friendly_name: wgClient.name,
        enabled: wgClient.enabled,
      };

      sentBytesTotal.remove(labels);
      sentBytesTotal.labels(labels).inc(wgClient.transferTx || 0);

      reveivedBytesTotal.remove(labels);
      reveivedBytesTotal.labels(labels).inc(wgClient.transferRx || 0);

      if (!wgClient.latestHandshakeAt) {
        latestHandshakeSeconds.labels(labels).set(0);
      } else {
        const seconds = Math.round(Date.parse(wgClient.latestHandshakeAt) / 1000.0);
        latestHandshakeSeconds.labels(labels).set(seconds);
      }

      if (!wgClient.persistentKeepalive || wgClient.persistentKeepalive === 'off') {
        persistentKeepaliveSeconds.labels(labels).set(0);
      } else {
        persistentKeepaliveSeconds.labels(labels).set(wgClient.persistentKeepalive);
      }
    }

    return client.register.metrics();
  }

};
