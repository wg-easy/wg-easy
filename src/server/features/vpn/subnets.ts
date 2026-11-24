import { parseCidr } from 'cidr-tools';

import type { ClientType } from '#db/repositories/client/types';
import type { Repositories } from '#db/store';
import type { InterfaceCidrUpdateType } from '#shared/contracts/interface';
import {
  isClientAddress,
  nextIPFromUsedAddresses,
  normalizeAddress,
} from '#server/utils/ip';

/** Reserve usable addresses before assigning any replacements. */
export async function renumberClients(
  tx: Repositories,
  clients: Pick<ClientType, 'id' | 'ipv4Address' | 'ipv6Address'>[],
  cidrs: InterfaceCidrUpdateType
) {
  for (const family of ['ipv4', 'ipv6'] as const) {
    const pool = parseCidr(cidrs[`${family}Cidr`]);
    const field = `${family}Address` as const;
    const used = new Set<string>();
    const moved = [];
    for (const client of clients) {
      const address = normalizeAddress(client[field]);
      if (isClientAddress(address, pool) && !used.has(address)) {
        used.add(address);
      } else {
        moved.push(client);
      }
    }
    for (const client of moved) {
      const address = nextIPFromUsedAddresses(pool, used);
      used.add(address);
      await tx.clients.update(client.id, { [field]: address });
      client[field] = address;
    }
  }
}
