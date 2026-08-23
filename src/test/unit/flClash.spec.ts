import { describe, expect, test } from 'vitest';

import {
  generateFlClashConfig,
  parseFlClashEndpointIpVersion,
  parseFlClashRemoteCidrs,
  parseWireGuardClientConfig,
  parseWireGuardEndpoint,
} from '../../server/utils/flClash';

const PRIVATE_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=';
const PUBLIC_KEY = 'AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI=';
const PRE_SHARED_KEY = 'AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM=';

const standardConfig = `[Interface]
PrivateKey = ${PRIVATE_KEY}
Address = 10.0.8.3/32
MTU = 1280
DNS = 192.0.2.1

[Peer]
PublicKey = ${PUBLIC_KEY}
PresharedKey = ${PRE_SHARED_KEY}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
Endpoint = wrt.example.com:51820`;

describe('FlClash profile generator', () => {
  test('parses standard WireGuard fields without breaking Base64 padding', () => {
    expect(parseWireGuardClientConfig(standardConfig)).toMatchObject({
      privateKey: PRIVATE_KEY,
      ipv4Address: '10.0.8.3',
      mtu: 1280,
      serverPublicKey: PUBLIC_KEY,
      preSharedKey: PRE_SHARED_KEY,
      endpoint: { server: 'wrt.example.com', port: 51820 },
      persistentKeepalive: 25,
      allowedIps: ['0.0.0.0/0'],
    });
  });

  test('parses bracketed IPv6 endpoints', () => {
    expect(parseWireGuardEndpoint('[2001:db8::1]:51820')).toEqual({
      server: '2001:db8::1',
      port: 51820,
    });
  });

  test('generates IPv4 data-plane profile for an IPv6-only endpoint', () => {
    const result = generateFlClashConfig(standardConfig, {
      remoteCidrs: ['10.0.8.0/24', '192.168.1.0/24'],
      endpointIpVersion: 'ipv6',
    });

    expect(result).toContain('type: wireguard');
    expect(result).toContain('server: "wrt.example.com"');
    expect(result).toContain('port: 51820');
    expect(result).toContain('ip-version: ipv6');
    expect(result).toContain('ip: "10.0.8.3"');
    expect(result).toContain(`private-key: "${PRIVATE_KEY}"`);
    expect(result).toContain(`public-key: "${PUBLIC_KEY}"`);
    expect(result).toContain(`pre-shared-key: "${PRE_SHARED_KEY}"`);
    expect(result).toContain('      - 0.0.0.0/0');
    expect(result).not.toContain('      - ::/0');
    expect(result).toContain('  ipv6: true');
    expect(result).toContain(
      '"wrt.example.com":\n      - "223.5.5.5#disable-ipv4=true"'
    );
    expect(result).toContain(
      '"https://1.1.1.1/dns-query#WG-ROUTER&disable-ipv6=true"'
    );
    expect(result).toContain(
      '"https://dns.alidns.com/dns-query#disable-ipv6=true"'
    );
    expect(result).toContain('"223.5.5.5#disable-ipv6=true"');

    const lanRule = result.indexOf(
      'IP-CIDR,192.168.1.0/24,WG-ROUTER,no-resolve'
    );
    const tunnelRule = result.indexOf(
      'IP-CIDR,10.0.8.0/24,WG-ROUTER,no-resolve'
    );
    const ipv6RejectRule = result.indexOf('IP-CIDR6,::/0,REJECT,no-resolve');
    const geositeRule = result.indexOf('GEOSITE,cn,DIRECT');
    const geoipRule = result.indexOf('GEOIP,CN,DIRECT');
    const matchRule = result.indexOf('MATCH,境外和远程局域网');
    expect(lanRule).toBeGreaterThan(-1);
    expect(tunnelRule).toBeGreaterThan(-1);
    expect(lanRule).toBeLessThan(geositeRule);
    expect(tunnelRule).toBeLessThan(geositeRule);
    expect(ipv6RejectRule).toBeLessThan(geositeRule);
    expect(geositeRule).toBeLessThan(geoipRule);
    expect(geoipRule).toBeLessThan(matchRule);
    expect(result).not.toContain('DNS =');
    expect(result).toContain('  - name: 境外和远程局域网');
    expect(result).toContain('  - MATCH,境外和远程局域网');
  });

  test('enables the IPv6 data-plane only when Address and AllowedIPs allow it', () => {
    const dualStack = standardConfig
      .replace('Address = 10.0.8.3/32', 'Address = 10.0.8.3/32, fd00::3/128')
      .replace('AllowedIPs = 0.0.0.0/0', 'AllowedIPs = 0.0.0.0/0, ::/0');
    const result = generateFlClashConfig(dualStack, {
      remoteCidrs: ['192.168.1.0/24'],
      endpointIpVersion: 'dual',
    });

    expect(result).toContain('    ipv6: "fd00::3"');
    expect(result).toContain('      - ::/0');
    expect(result).toContain('  ipv6: true');
    expect(result).not.toContain('IP-CIDR6,::/0,REJECT');
    expect(result).not.toContain('disable-ipv6=true');
  });

  test('maps AmneziaWG fields without treating them as standard WireGuard', () => {
    const amnezia = standardConfig.replace(
      'MTU = 1280',
      'MTU = 1280\nJc = 7\nJmin = 10\nJmax = 1000\nS1 = 128\nS2 = 56\nH1 = 123456\nI1 = <b 0xf6ab>'
    );
    const result = generateFlClashConfig(amnezia, {
      remoteCidrs: ['192.168.1.0/24'],
      endpointIpVersion: 'dual',
    });

    expect(result).toContain('    amnezia-wg-option:');
    expect(result).toContain('      jc: 7');
    expect(result).toContain('      h1: 123456');
    expect(result).toContain('      i1: "<b 0xf6ab>"');
  });

  test('rejects malformed configs and unsafe environment values', () => {
    expect(() =>
      parseWireGuardClientConfig(
        standardConfig.replace(
          'AllowedIPs = 0.0.0.0/0',
          'AllowedIPs = 10.0.0.0/8'
        )
      )
    ).toThrow('Invalid WireGuard client configuration');
    expect(() =>
      parseWireGuardClientConfig(
        standardConfig.replace(
          `PrivateKey = ${PRIVATE_KEY}`,
          `PrivateKey = ${PRIVATE_KEY}\nPrivateKey = ${PUBLIC_KEY}`
        )
      )
    ).toThrow('Invalid WireGuard client configuration');
    expect(() => parseFlClashRemoteCidrs('not-a-cidr')).toThrow();
    expect(() => parseFlClashEndpointIpVersion('automatic')).toThrow();
    expect(() => parseWireGuardEndpoint('bad host.example:51820')).toThrow();
    expect(() =>
      generateFlClashConfig(standardConfig, {
        remoteCidrs: ['fd00::/64'],
        endpointIpVersion: 'ipv6',
      })
    ).toThrow('IPv6 remote CIDR requires an IPv6 WireGuard tunnel');
  });
});
