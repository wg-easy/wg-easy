import { containsCidr, parseCidr } from 'cidr-tools';

import { peerAllowedIps, type ServerPeer } from './configuration';

import type {
  ClientNextIpType,
  ClientType,
} from '#db/repositories/client/types';
import { zeroWireGuardKey } from '#shared/utils/wireguard';
import type { InterfaceCidrUpdateType } from '#shared/contracts/interface';
import {
  isClientAddress,
  normalizeAddress,
  normalizePrefix,
} from '#server/utils/ip';

export type PeerAddresses = {
  ipv4Address: string | null;
  ipv6Address: string | null;
};
type SavedPeer = ClientNextIpType & Pick<ClientType, 'id' | 'serverAllowedIps'>;

function addressFor(
  field: keyof PeerAddresses,
  savedCidr: string,
  activeCidr: string,
  peers: SavedPeer[],
  previous: ReadonlyMap<number, PeerAddresses>
) {
  if (savedCidr === activeCidr) {
    return (peer: SavedPeer) => peer[field];
  }
  const pool = parseCidr(activeCidr);
  const reserved = new Set<string>();
  for (const peer of peers) {
    const address = previous.get(peer.id)?.[field];
    if (address) {
      reserved.add(normalizeAddress(address));
    }
  }
  return (peer: SavedPeer) => {
    const established = previous.get(peer.id)?.[field];
    if (established) {
      return established;
    }
    // A new peer can use an overlapping subnet, unless an established peer
    // still owns that address on the running link.
    const address = peer[field];
    return isClientAddress(address, pool) &&
      !reserved.has(normalizeAddress(address))
      ? address
      : null;
  };
}

export function peersForRunningNetwork<T extends SavedPeer>(
  peers: T[],
  saved: InterfaceCidrUpdateType,
  active: InterfaceCidrUpdateType | undefined,
  previous: ReadonlyMap<number, PeerAddresses>,
  enableIpv6: boolean
): (Omit<T, keyof PeerAddresses> & PeerAddresses)[] {
  if (
    !active ||
    (active.ipv4Cidr === saved.ipv4Cidr && active.ipv6Cidr === saved.ipv6Cidr)
  ) {
    return peers;
  }
  const ipv4 = addressFor(
    'ipv4Address',
    saved.ipv4Cidr,
    active.ipv4Cidr,
    peers,
    previous
  );
  const ipv6 = addressFor(
    'ipv6Address',
    saved.ipv6Cidr,
    active.ipv6Cidr,
    peers,
    previous
  );
  return peers.flatMap((peer) => {
    const ipv4Address = ipv4(peer);
    const ipv6Address = enableIpv6 ? ipv6(peer) : null;
    if (!ipv4Address && !ipv6Address) {
      return [];
    }
    const serverAllowedIps = peer.serverAllowedIps.filter((prefix) =>
      prefix.includes(':') ? ipv6Address : ipv4Address
    );
    return [{ ...peer, ipv4Address, ipv6Address, serverAllowedIps }];
  });
}

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
