import { Resolver } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';

import { normalizeIp, parseIp, stringifyIp } from 'ip-bigint';
import { createError } from 'nuxt/server';
import { parseCidr } from 'cidr-tools';

import { cacheFunction } from '#server/utils/cache';
import type { InterfaceCidrUpdateType } from '#shared/contracts/interface';
import type { ClientNextIpType } from '#db/repositories/client/types';

type ParsedCidr = ReturnType<typeof parseCidr>;

export function normalizePrefix(value: string) {
  if (value.includes('%')) {
    throw new Error('Site routes cannot include an IPv6 zone ID');
  }
  // Always use the network address and an explicit mask, even for host routes.
  const { start, version, prefix } = parseCidr(value);
  return `${stringifyIp({ number: start, version }, { hexify: true })}/${prefix}`;
}

export function normalizeAddress(address: string) {
  return normalizeIp(address, { hexify: true });
}

function gatewayNumber(cidr: ParsedCidr) {
  const { number } = parseIp(cidr.ip);
  // Network-address CIDRs keep the first host as the gateway for older setups.
  return number === cidr.start ? cidr.start + 1n : number;
}

export function getGatewayAddress(cidr: ParsedCidr) {
  return stringifyIp(
    { number: gatewayNumber(cidr), version: cidr.version },
    { hexify: true }
  );
}

export function assertSubnetCapacity(
  cidrs: InterfaceCidrUpdateType,
  count: number
) {
  for (const value of [cidrs.ipv4Cidr, cidrs.ipv6Cidr]) {
    const pool = parseCidr(value);
    const reserved = new Set([pool.start, pool.end]);
    const gateway = gatewayNumber(pool);
    if (gateway <= pool.end) {
      reserved.add(gateway);
    }
    if (BigInt(count) > pool.end - pool.start + 1n - BigInt(reserved.size)) {
      throw createError({
        status: 422,
        message: `Maximum number of clients reached for ${value}. Choose a larger IPv${pool.version} subnet.`,
      });
    }
  }
}

/** Match the allocation pool: reserve the network, server, and last address. */
export function isClientAddress(address: string, cidr: ParsedCidr) {
  const { number, version } = parseIp(address);
  return (
    version === cidr.version &&
    number > cidr.start &&
    number < cidr.end &&
    number !== gatewayNumber(cidr)
  );
}

export function nextIP(cidr: ParsedCidr, clients: ClientNextIpType[]) {
  const usedAddresses = new Set(
    clients.map((client) =>
      normalizeAddress(client[`ipv${cidr.version}Address`])
    )
  );

  return nextIPFromUsedAddresses(cidr, usedAddresses);
}

export function nextIPFromUsedAddresses(
  cidr: ParsedCidr,
  usedAddresses: Set<string>
) {
  const { version } = cidr;
  const gateway = gatewayNumber(cidr);
  for (let i = cidr.start + 1n; i < cidr.end; i++) {
    if (i === gateway) {
      continue;
    }
    const currentIp = stringifyIp({ number: i, version }, { hexify: true });

    if (!usedAddresses.has(currentIp)) {
      return currentIp;
    }
  }

  throw new Error('Maximum number of clients reached', {
    cause: `IPv${version} Address Pool exhausted`,
  });
}

// use opendns to get public ip
const dnsServers = {
  ip4: ['208.67.222.222'],
  ip6: ['2620:119:35::35'],
  ip: 'myip.opendns.com',
};

async function getPublicInformation() {
  const ipv4 = await getPublicIpv4();
  const ipv6 = await getPublicIpv6();

  const ptr4 = ipv4 ? await getReverseDns(ipv4) : [];
  const ptr6 = ipv6 ? await getReverseDns(ipv6) : [];
  const hostnames = [...new Set([...ptr4, ...ptr6])];

  return { ipv4, ipv6, hostnames };
}

async function getPublicIpv4() {
  try {
    const resolver = new Resolver();
    resolver.setServers(dnsServers.ip4);
    const ipv4 = await resolver.resolve4(dnsServers.ip);
    return ipv4[0];
  } catch {
    return null;
  }
}

async function getPublicIpv6() {
  try {
    const resolver = new Resolver();
    resolver.setServers(dnsServers.ip6);
    const ipv6 = await resolver.resolve6(dnsServers.ip);
    return ipv6[0];
  } catch {
    return null;
  }
}

async function getReverseDns(ip: string) {
  try {
    const resolver = new Resolver();
    resolver.setServers([...dnsServers.ip4, ...dnsServers.ip6]);
    const ptr = await resolver.reverse(ip);
    return ptr;
  } catch {
    return [];
  }
}

function getPrivateInformation(interfaceName: string) {
  const interfaces = networkInterfaces();

  const interfaceNames = Object.keys(interfaces);

  const obj: Record<string, { ipv4: string[]; ipv6: string[] }> = {};

  for (const name of interfaceNames) {
    if (name === interfaceName) {
      continue;
    }

    const iface = interfaces[name];
    if (!iface) {
      continue;
    }

    for (const { family, internal, address } of iface) {
      if (internal) {
        continue;
      }
      if (!obj[name]) {
        obj[name] = {
          ipv4: [],
          ipv6: [],
        };
      }
      if (family === 'IPv4') {
        obj[name].ipv4.push(address);
      } else if (family === 'IPv6') {
        obj[name].ipv6.push(address);
      }
    }
  }

  return obj;
}

export async function getIpInformation(interfaceName: string) {
  const results = [];

  const publicInfo = await cachedGetPublicInformation();
  if (publicInfo.ipv4) {
    results.push({
      value: publicInfo.ipv4,
      label: 'IPv4 - Public',
    });
  }
  if (publicInfo.ipv6) {
    results.push({
      value: `[${publicInfo.ipv6}]`,
      label: 'IPv6 - Public',
    });
  }
  for (const hostname of publicInfo.hostnames) {
    results.push({
      value: hostname,
      label: 'Hostname - Public',
    });
  }

  const privateInfo = getPrivateInformation(interfaceName);
  for (const [name, { ipv4, ipv6 }] of Object.entries(privateInfo)) {
    for (const ip of ipv4) {
      results.push({
        value: ip,
        label: `IPv4 - ${name}`,
      });
    }
    for (const ip of ipv6) {
      results.push({
        value: `[${ip}]`,
        label: `IPv6 - ${name}`,
      });
    }
  }

  return results;
}

/**
 * Fetch public IP Information
 * @cache Response is cached for 15 min
 */
const cachedGetPublicInformation = cacheFunction(getPublicInformation, {
  expiry: 15 * 60 * 1000,
});
