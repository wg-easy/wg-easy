import { isIP } from 'node:net';

import isCidr from 'is-cidr';

const ENDPOINT_IP_VERSIONS = [
  'dual',
  'ipv4',
  'ipv6',
  'ipv4-prefer',
  'ipv6-prefer',
] as const;

export type FlClashEndpointIpVersion = (typeof ENDPOINT_IP_VERSIONS)[number];

export type FlClashOptions = {
  remoteCidrs: string[];
  endpointIpVersion: FlClashEndpointIpVersion;
};

type WireGuardEndpoint = {
  server: string;
  port: number;
};

export type ParsedWireGuardConfig = {
  privateKey: string;
  ipv4Address: string;
  ipv6Address?: string;
  mtu?: number;
  serverPublicKey: string;
  preSharedKey?: string;
  endpoint: WireGuardEndpoint;
  persistentKeepalive?: number;
  allowedIps: string[];
  amneziaOptions: Map<string, string>;
};

type SectionName = 'interface' | 'peer';

const invalidConfiguration = () =>
  new Error('Invalid WireGuard client configuration');

function getSingleValue(
  section: Map<string, string>,
  key: string,
  required = true
) {
  const value = section.get(key.toLowerCase());
  if (required && !value) {
    throw invalidConfiguration();
  }
  return value;
}

function parseInteger(
  value: string | undefined,
  minimum: number,
  maximum: number
) {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    throw invalidConfiguration();
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw invalidConfiguration();
  }
  return parsed;
}

function validateWireGuardKey(value: string) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw invalidConfiguration();
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value) {
    throw invalidConfiguration();
  }
  return value;
}

function isValidHost(value: string) {
  if (isIP(value) !== 0) {
    return true;
  }

  if (value.length > 253 || !/^[A-Za-z0-9.-]+$/.test(value)) {
    return false;
  }

  const hostname = value.endsWith('.') ? value.slice(0, -1) : value;
  return hostname
    .split('.')
    .every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
    );
}

function parseAddressList(value: string) {
  const addresses = value
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => {
      if (isCidr(address) === 0) {
        throw invalidConfiguration();
      }
      const slashIndex = address.lastIndexOf('/');
      const ip = address.slice(0, slashIndex);
      return { ip, version: isIP(ip) };
    });

  const ipv4Address = addresses.find(({ version }) => version === 4)?.ip;
  if (!ipv4Address) {
    throw invalidConfiguration();
  }

  return {
    ipv4Address,
    ipv6Address: addresses.find(({ version }) => version === 6)?.ip,
  };
}

export function parseWireGuardEndpoint(value: string): WireGuardEndpoint {
  const bracketedIpv6 = value.match(/^\[([^\]]+)]:(\d+)$/);
  let server: string;
  let portText: string;

  if (bracketedIpv6) {
    server = bracketedIpv6[1]!;
    portText = bracketedIpv6[2]!;
    if (isIP(server) !== 6) {
      throw invalidConfiguration();
    }
  } else {
    const separatorIndex = value.lastIndexOf(':');
    if (separatorIndex <= 0 || value.indexOf(':') !== separatorIndex) {
      throw invalidConfiguration();
    }
    server = value.slice(0, separatorIndex).trim();
    portText = value.slice(separatorIndex + 1).trim();
  }

  if (!isValidHost(server)) {
    throw invalidConfiguration();
  }

  const port = parseInteger(portText, 1, 65_535);
  if (port === undefined) {
    throw invalidConfiguration();
  }

  return { server, port };
}

export function parseWireGuardClientConfig(
  config: string
): ParsedWireGuardConfig {
  const sections: Record<SectionName, Map<string, string>> = {
    interface: new Map(),
    peer: new Map(),
  };
  const sectionCounts: Record<SectionName, number> = {
    interface: 0,
    peer: 0,
  };
  let currentSection: SectionName | null = null;

  for (const rawLine of config.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const header = line.match(/^\[([^\]]+)]$/);
    if (header) {
      const name = header[1]!.toLowerCase();
      currentSection = name === 'interface' || name === 'peer' ? name : null;
      if (currentSection) {
        sectionCounts[currentSection] += 1;
      }
      continue;
    }

    if (!currentSection) {
      throw invalidConfiguration();
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      throw invalidConfiguration();
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value || sections[currentSection].has(key)) {
      throw invalidConfiguration();
    }
    sections[currentSection].set(key, value);
  }

  if (sectionCounts.interface !== 1 || sectionCounts.peer !== 1) {
    throw invalidConfiguration();
  }

  const interfaceSection = sections.interface;
  const peerSection = sections.peer;
  const privateKey = validateWireGuardKey(
    getSingleValue(interfaceSection, 'PrivateKey')!
  );
  const address = getSingleValue(interfaceSection, 'Address')!;
  const serverPublicKey = validateWireGuardKey(
    getSingleValue(peerSection, 'PublicKey')!
  );
  const endpoint = parseWireGuardEndpoint(
    getSingleValue(peerSection, 'Endpoint')!
  );
  const allowedIps = getSingleValue(peerSection, 'AllowedIPs')!
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (
    !allowedIps.includes('0.0.0.0/0') ||
    allowedIps.some((entry) => isCidr(entry) === 0)
  ) {
    throw invalidConfiguration();
  }

  const preSharedKeyValue = getSingleValue(peerSection, 'PresharedKey', false);

  const amneziaOptions = new Map<string, string>();
  for (const key of [
    'Jc',
    'Jmin',
    'Jmax',
    'S1',
    'S2',
    'S3',
    'S4',
    'H1',
    'H2',
    'H3',
    'H4',
    'I1',
    'I2',
    'I3',
    'I4',
    'I5',
  ]) {
    const value = getSingleValue(interfaceSection, key, false);
    if (value) {
      amneziaOptions.set(key.toLowerCase(), value);
    }
  }

  return {
    privateKey,
    ...parseAddressList(address),
    mtu: parseInteger(
      getSingleValue(interfaceSection, 'MTU', false),
      576,
      9_000
    ),
    serverPublicKey,
    preSharedKey: preSharedKeyValue
      ? validateWireGuardKey(preSharedKeyValue)
      : undefined,
    endpoint,
    persistentKeepalive: parseInteger(
      getSingleValue(peerSection, 'PersistentKeepalive', false),
      0,
      65_535
    ),
    allowedIps,
    amneziaOptions,
  };
}

export function parseFlClashRemoteCidrs(value: string) {
  const cidrs = [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    ),
  ];

  if (cidrs.length === 0 || cidrs.length > 32) {
    throw new Error('Invalid FlClash remote CIDR configuration');
  }

  for (const cidr of cidrs) {
    if (isCidr(cidr) === 0) {
      throw new Error('Invalid FlClash remote CIDR configuration');
    }
  }
  return cidrs;
}

export function parseFlClashEndpointIpVersion(
  value: string
): FlClashEndpointIpVersion {
  if (!ENDPOINT_IP_VERSIONS.includes(value as FlClashEndpointIpVersion)) {
    throw new Error('Invalid FlClash endpoint IP version');
  }
  return value as FlClashEndpointIpVersion;
}

function renderAmneziaOptions(options: Map<string, string>) {
  if (options.size === 0) {
    return '';
  }

  const numericKeys = new Set(['jc', 'jmin', 'jmax', 's1', 's2', 's3', 's4']);
  const headerKeys = new Set(['h1', 'h2', 'h3', 'h4']);
  const lines = ['    amnezia-wg-option:'];

  for (const [key, value] of options) {
    if (numericKeys.has(key)) {
      if (!/^\d+$/.test(value)) {
        throw invalidConfiguration();
      }
      lines.push(`      ${key}: ${value}`);
    } else if (headerKeys.has(key)) {
      if (!/^\d+(?:-\d+)?$/.test(value)) {
        throw invalidConfiguration();
      }
      lines.push(`      ${key}: ${value}`);
    } else {
      lines.push(`      ${key}: ${JSON.stringify(value)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function generateFlClashConfig(
  wireGuardConfig: string,
  options: FlClashOptions
) {
  const parsed = parseWireGuardClientConfig(wireGuardConfig);
  const remoteCidrs = parseFlClashRemoteCidrs(options.remoteCidrs.join(','));
  const hasIpv6Tunnel =
    parsed.ipv6Address !== undefined && parsed.allowedIps.includes('::/0');

  if (!hasIpv6Tunnel && remoteCidrs.some((cidr) => isCidr(cidr) === 6)) {
    throw new Error('IPv6 remote CIDR requires an IPv6 WireGuard tunnel');
  }

  const quote = (value: string) => JSON.stringify(value);
  const endpointIsDomain = isIP(parsed.endpoint.server) === 0;
  const applicationDnsParameter = hasIpv6Tunnel ? '' : '#disable-ipv6=true';
  const proxiedDnsParameter = hasIpv6Tunnel
    ? '#WG-ROUTER'
    : '#WG-ROUTER&disable-ipv6=true';

  const endpointPolicy = endpointIsDomain
    ? `  proxy-server-nameserver-policy:\n    ${quote(parsed.endpoint.server)}:\n${
        options.endpointIpVersion === 'ipv6'
          ? '      - "223.5.5.5#disable-ipv4=true"\n      - "119.29.29.29#disable-ipv4=true"\n'
          : options.endpointIpVersion === 'ipv4'
            ? '      - "223.5.5.5#disable-ipv6=true"\n      - "119.29.29.29#disable-ipv6=true"\n'
            : '      - 223.5.5.5\n      - 119.29.29.29\n'
      }`
    : '';

  const ipv6ProxyLine = hasIpv6Tunnel
    ? `    ipv6: ${quote(parsed.ipv6Address!)}\n`
    : '';
  const preSharedKeyLine = parsed.preSharedKey
    ? `    pre-shared-key: ${quote(parsed.preSharedKey)}\n`
    : '';
  const mtuLine = parsed.mtu ? `    mtu: ${parsed.mtu}\n` : '';
  const keepaliveLine =
    parsed.persistentKeepalive !== undefined
      ? `    persistent-keepalive: ${parsed.persistentKeepalive}\n`
      : '';
  const ipv6AllowedIpLine = hasIpv6Tunnel ? '      - ::/0\n' : '';
  const remoteRules = remoteCidrs
    .map(
      (cidr) =>
        `  - ${isCidr(cidr) === 6 ? 'IP-CIDR6' : 'IP-CIDR'},${cidr},WG-ROUTER,no-resolve`
    )
    .join('\n');
  const ipv6FallbackRule = hasIpv6Tunnel
    ? ''
    : '  # 当前 WireGuard 隧道只有 IPv4；阻止 IPv6 旁路泄漏。\n  - IP-CIDR6,::/0,REJECT,no-resolve\n\n';

  return `# FlClash / Mihomo 分流配置
# 包含 WireGuard 客户端私钥，请勿上传、分享或截图。
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
ipv6: true
unified-delay: true
tcp-concurrent: true

profile:
  store-selected: true
  store-fake-ip: true

tun:
  enable: true
  stack: mixed
  auto-route: true
  auto-detect-interface: true
  strict-route: true
  dns-hijack:
    - any:53
    - tcp://any:53

# 这是 Mihomo 的分流解析设置，不会写入 WireGuard 的 DNS 字段。
dns:
  enable: true
  listen: 0.0.0.0:1053
  # 保持 DNS 内核可解析 IPv6 公网端点；无 IPv6 隧道时由下方 DNS 参数过滤业务 AAAA。
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  respect-rules: false
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - ${quote(`https://1.1.1.1/dns-query${proxiedDnsParameter}`)}
    - ${quote(`https://8.8.8.8/dns-query${proxiedDnsParameter}`)}
  nameserver-policy:
    "geosite:cn":
      - ${quote(`https://dns.alidns.com/dns-query${applicationDnsParameter}`)}
      - ${quote(`https://doh.pub/dns-query${applicationDnsParameter}`)}
  proxy-server-nameserver:
    - 223.5.5.5
    - 119.29.29.29
${endpointPolicy}  direct-nameserver:
    - ${quote(`223.5.5.5${applicationDnsParameter}`)}
    - ${quote(`119.29.29.29${applicationDnsParameter}`)}
  fake-ip-filter:
    - "*.lan"
    - "*.local"

proxies:
  - name: WG-ROUTER
    type: wireguard
    server: ${quote(parsed.endpoint.server)}
    port: ${parsed.endpoint.port}
    ip-version: ${options.endpointIpVersion}
    ip: ${quote(parsed.ipv4Address)}
${ipv6ProxyLine}    private-key: ${quote(parsed.privateKey)}
    public-key: ${quote(parsed.serverPublicKey)}
${preSharedKeyLine}    allowed-ips:
      - 0.0.0.0/0
${ipv6AllowedIpLine}    udp: true
${mtuLine}${keepaliveLine}${renderAmneziaOptions(parsed.amneziaOptions)}
proxy-groups:
  - name: 境外和远程局域网
    type: select
    proxies:
      - WG-ROUTER

rules:
  # 远端局域网和 WireGuard 隧道网段必须优先进入 WireGuard。
${remoteRules}

${ipv6FallbackRule}  # 国内域名与国内 IP 使用手机当前网络。
  - GEOSITE,cn,DIRECT
  - GEOIP,CN,DIRECT

  # 其他流量先进入 WireGuard，再由远端路由器处理境外代理。
  - MATCH,境外和远程局域网
`;
}
