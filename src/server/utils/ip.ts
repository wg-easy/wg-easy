import type { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';

import type { ClientType } from '#db/repositories/client/types';

type ParsedCidr = ReturnType<typeof parseCidr>;

export function nextIP(
  version: 4 | 6,
  cidr: ParsedCidr,
  clients: ClientType[]
) {
  let address;
  for (let i = cidr.start + 2n; i <= cidr.end - 1n; i++) {
    const currentIp = stringifyIp({ number: i, version: version });
    const client = clients.find((client) => {
      return client[`ipv${version}Address`] === currentIp;
    });

    if (!client) {
      address = currentIp;
      break;
    }
  }

  if (!address) {
    throw new Error('Maximum number of clients reached', {
      cause: `IPv${version} Address Pool exhausted`,
    });
  }

  return address;
}
