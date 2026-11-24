import { parseCidr } from 'cidr-tools';

import type {
  ClientNextIpType,
  ClientType,
} from '#db/repositories/client/types';
import type { InterfaceCidrUpdateType } from '#shared/contracts/interface';
import { isClientAddress, normalizeAddress } from '#server/utils/ip';

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
