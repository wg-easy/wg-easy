import { containsCidr } from 'cidr-tools';

import { peerAllowedIps, type ServerPeer } from './configuration';

import { zeroWireGuardKey } from '#shared/utils/wireguard';
import { normalizePrefix } from '#server/utils/ip';

function effectivePsk(key: string | null) {
  return key && key !== '(none)' && key !== zeroWireGuardKey ? key : null;
}

/** Reopen filtering after a failed peer update only for verified sources. */
export function peersWithVerifiedSources(
  clients: ServerPeer[],
  running: { publicKey: string; preSharedKey: string; allowedIps: string }[],
  enableIpv6: boolean,
  restoredDefaults: ReadonlyMap<string, string | undefined>
) {
  const enabled = clients
    .filter((client) => client.enabled)
    .map((client) => {
      if (!restoredDefaults.size) {
        return client;
      }
      const serverAllowedIps = client.serverAllowedIps.filter(
        (ip) => !restoredDefaults.has(normalizePrefix(ip))
      );
      for (const [prefix, previousKey] of restoredDefaults) {
        if (client.publicKey === previousKey) {
          serverAllowedIps.push(prefix);
        }
      }
      return { ...client, serverAllowedIps };
    });
  const credentials = new Map(
    enabled.map((client) => [
      client.publicKey,
      effectivePsk(client.preSharedKey),
    ])
  );
  const active = new Map<string, string | null>();
  for (const peer of running) {
    const owner =
      credentials.get(peer.publicKey) === effectivePsk(peer.preSharedKey)
        ? peer.publicKey
        : null;
    for (const ip of peer.allowedIps.split(',')) {
      if (ip && ip !== '(none)') {
        active.set(normalizePrefix(ip), owner);
      }
    }
  }
  const expected = new Map<string, string | null>();
  for (const peer of enabled) {
    for (const ip of peerAllowedIps(peer, enableIpv6)) {
      const prefix = normalizePrefix(ip);
      const owner = expected.get(prefix);
      expected.set(
        prefix,
        owner === undefined || owner === peer.publicKey ? peer.publicKey : null
      );
    }
  }
  const changed = [...new Set([...active.keys(), ...expected.keys()])].filter(
    (prefix) =>
      !active.get(prefix) || active.get(prefix) !== expected.get(prefix)
  );
  return enabled
    .map((client) => {
      const verified = (ip: string) => {
        const prefix = normalizePrefix(ip);
        return (
          active.get(prefix) === client.publicKey &&
          expected.get(prefix) === client.publicKey &&
          !changed.some((other) => containsCidr(prefix, other))
        );
      };
      return {
        ...client,
        ipv4Address:
          client.ipv4Address && verified(client.ipv4Address)
            ? client.ipv4Address
            : null,
        ipv6Address:
          enableIpv6 && client.ipv6Address && verified(client.ipv6Address)
            ? client.ipv6Address
            : null,
        serverAllowedIps: client.serverAllowedIps.filter(verified),
      };
    })
    .filter((client) => client.ipv4Address || client.ipv6Address);
}
