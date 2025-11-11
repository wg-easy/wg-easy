import { Resolver } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';
import { stringifyIp } from 'ip-bigint';
import type { parseCidr } from 'cidr-tools';

import type { ClientNextIpType } from '#db/repositories/client/types';

type ParsedCidr = ReturnType<typeof parseCidr>;

export function nextIP(
  version: 4 | 6,
  cidr: ParsedCidr,
  clients: ClientNextIpType[]
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

function getPrivateInformation() {
  const interfaces = networkInterfaces();

  const interfaceNames = Object.keys(interfaces);

  const obj: Record<string, { ipv4: string[]; ipv6: string[] }> = {};

  for (const name of interfaceNames) {
    if (name === 'wg0') {
      continue;
    }

    const iface = interfaces[name];
    if (!iface) continue;

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

async function getIpInformation() {
  const results = [];

  const publicInfo = await getPublicInformation();
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

  const privateInfo = getPrivateInformation();
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
 * Fetch IP Information
 * @cache Response is cached for 15 min
 */
export const cachedGetIpInformation = cacheFunction(getIpInformation, {
  expiry: 15 * 60 * 1000,
});

// 检查IP地址是否为IPv6
export const isIPv6 = (ip: string): boolean => {
  return ip.startsWith('[') || ip.split(':').length > 2;
};

// 解析IP地址和端口
export const parseIpAndPort = (
  ipWithPort: string
): { ip: string; port?: string } => {
  if (ipWithPort.includes('/')) {
    return { ip: ipWithPort };
  }
  const parts = ipWithPort.split(':');
  // 如果是IPv6地址（包含多个冒号），则最后一个部分可能是端口
  if (isIPv6(ipWithPort) && parts.length > 3) {
    // 检查最后一部分是否是纯数字（端口）
    const potentialPort = parts[parts.length - 1];
    let ip = parts.slice(0, -1).join(':');
    // remove [ ] if exist in ip
    const matched = /^\[?([0-9a-f:]+)]?$/gi.exec(ip);
    if (matched) {
      ip = matched[1];
    }

    if (/^\d+$/.test(potentialPort)) {
      return {
        ip: ip,
        port: potentialPort,
      };
    }
  } else if (!isIPv6(ipWithPort) && parts.length === 2) {
    // 对于IPv4地址，格式为 ip:port
    return {
      ip: parts[0],
      port: parts[1],
    };
  }
  // 如果没有端口，则返回原始IP
  return { ip: ipWithPort };
};
