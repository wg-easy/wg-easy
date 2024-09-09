import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';
import type { Database } from '~~/services/database/repositories/database';

export function nextIPv4(
  system: Database['system'],
  clients: Database['clients']
) {
  return nextIP(4, system, clients);
}

export function nextIPv6(
  system: Database['system'],
  clients: Database['clients']
) {
  return nextIP(6, system, clients);
}

function nextIP(
  version: 4 | 6,
  system: Database['system'],
  clients: Database['clients']
) {
  const cidr = parseCidr(system.userConfig[`address${version}Range`]);
  let address;
  for (let i = cidr.start + 2n; i <= cidr.end - 1n; i++) {
    const currentIp = stringifyIp({ number: i, version: version });
    const client = Object.values(clients).find((client) => {
      return client[`address${version}`] === currentIp;
    });

    if (!client) {
      address = currentIp;
      break;
    }
  }

  if (!address) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Maximum number of clients reached.',
      data: { cause: `IPv${version} Address Pool exhausted` },
    });
  }

  return address;
}
