import { expect, test, vi } from 'vitest';

import { vpnFixture } from '../helpers/vpn';
import { resetCryptoMocks } from '../helpers/crypto';
import { requestEvent } from '../helpers/request';

import jsonMetrics from '#server/routes/metrics/json.get';
import prometheusMetrics from '#server/routes/metrics/prometheus.get';

async function fixture() {
  const result = await vpnFixture();
  resetCryptoMocks();
  await result.store.general.update({
    metricsJson: true,
    metricsPrometheus: true,
    metricsPassword: null,
  });
  return result;
}

test('uses the same counts and peer status for both monitoring formats', async () => {
  const { store, commands } = await fixture();
  const now = 1_800_000_000_000;
  vi.spyOn(Date, 'now').mockReturnValue(now);
  await store.clients.update(1, { name: 'home\\office\n"peer"' });
  await store.clients.insert({
    ...(await store.clients.get(1))!,
    id: 2,
    name: 'Offline',
    enabled: false,
    publicKey: 'offline',
    ipv4Address: '10.8.0.3',
    ipv6Address: 'fd00::3',
  });
  const peer = {
    publicKey: 'public',
    preSharedKey: 'secret',
    allowedIps: '',
    persistentKeepalive: '0',
    endpoint: '192.0.2.1:50000',
    latestHandshakeAt: new Date(now - 30_000),
    transferRx: 12,
    transferTx: 34,
  };
  commands.dump.mockResolvedValue([
    peer,
    { ...peer, publicKey: 'unknown', transferTx: 999 },
  ]);

  const json = await jsonMetrics(requestEvent('http://localhost/metrics/json'));
  expect(json).toMatchObject({
    wireguard_configured_peers: 2,
    wireguard_enabled_peers: 1,
    wireguard_connected_peers: 1,
  });
  expect(
    json.clients.find((client) => client.publicKey === 'public')
  ).toMatchObject({
    transferRx: 12,
    transferTx: 34,
    endpoint: '192.0.2.1:50000',
  });
  expect(
    json.clients.find((client) => client.publicKey === 'offline')
  ).toMatchObject({
    latestHandshakeAt: null,
    transferRx: null,
    transferTx: null,
    endpoint: null,
  });
  for (const client of json.clients) {
    expect(client).not.toHaveProperty('privateKey');
    expect(client).not.toHaveProperty('preSharedKey');
  }
  const event = requestEvent('http://localhost/metrics/prometheus');
  const text = await prometheusMetrics(event);
  expect(event.res.headers.get('content-type')).toBe('text/plain');
  expect(text).toContain('wireguard_configured_peers{interface="wg0"} 2');
  expect(text).toContain('wireguard_enabled_peers{interface="wg0"} 1');
  expect(text).toContain('wireguard_connected_peers{interface="wg0"} 1');
  expect(text).toContain(String.raw`name="home\\office\n\"peer\""`);
  expect(text).toMatch(/wireguard_sent_bytes\{[^\n]+\} 34/);
  expect(text).toMatch(/wireguard_received_bytes\{[^\n]+\} 12/);
  expect(text).toMatch(/wireguard_latest_handshake_seconds\{[^\n]+\} 30/);
  expect(text).toMatch(
    /wireguard_latest_handshake_seconds\{[^\n]+name="Offline"\} 0/
  );
  expect(text).toContain('Seconds since the last handshake');
  expect(text).not.toContain('999');
  expect(text).not.toContain('secret');
  expect(commands.dump).toHaveBeenNthCalledWith(1, 'wg0');
  expect(commands.dump).toHaveBeenNthCalledWith(2, 'wg0');
});

test('renders empty monitoring output without inventing peers', async () => {
  const { store } = await fixture();
  await store.clients.deleteMany([1]);
  expect(
    await jsonMetrics(requestEvent('http://localhost/metrics/json'))
  ).toEqual({
    wireguard_configured_peers: 0,
    wireguard_enabled_peers: 0,
    wireguard_connected_peers: 0,
    clients: [],
  });
  const text = await prometheusMetrics(
    requestEvent('http://localhost/metrics/prometheus')
  );
  expect(text).toContain('wireguard_configured_peers{interface="wg0"} 0');
  expect(text).not.toMatch(/^wireguard_sent_bytes\{/m);
});

test.each([
  ['json', jsonMetrics],
  ['prometheus', prometheusMetrics],
] as const)(
  'authorizes %s before reading host state',
  async (format, handler) => {
    const { store, commands } = await fixture();
    await store.general.update({ metricsPassword: 'hash:secret' });
    await expect(
      handler(requestEvent(`http://localhost/metrics/${format}`))
    ).rejects.toMatchObject({ status: 401 });
    expect(commands.dump).not.toHaveBeenCalled();
    await handler(
      requestEvent(`http://localhost/metrics/${format}`, {
        headers: { authorization: 'Bearer secret' },
      })
    );
    expect(commands.dump).toHaveBeenCalledOnce();
  }
);
