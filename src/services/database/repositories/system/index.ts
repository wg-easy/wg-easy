import packageJson from '@/package.json';

import { ChartType, Lang } from '../types';

import type { System } from './model';

const DEFAULT_SYSTEM_MODEL: System = {
  release: packageJson.release.version,
  interface: {
    privateKey: '',
    publicKey: '',
    address: '10.8.0.1',
  },
  port: PORT ? Number(PORT) : 51821,
  webuiHost: '0.0.0.0',
  sessionTimeout: 3600, // 1 hour
  lang: Lang.EN,
  userConfig: {
    mtu: 1420,
    persistentKeepalive: 0,
    // TODO: assume handle CIDR to compute next ip in WireGuard
    rangeAddress: '10.8.0.0/24',
    defaultDns: ['1.1.1.1'],
    allowedIps: ['0.0.0.0/0', '::/0'],
  },
  wgPath: WG_PATH,
  wgDevice: 'wg0',
  wgHost: WG_HOST || '',
  wgPort: 51820,
  wgConfigPort: 51820,
  iptables: {
    wgPreUp: '',
    wgPostUp: '',
    wgPreDown: '',
    wgPostDown: '',
  },
  trafficStats: {
    enabled: false,
    type: ChartType.None,
  },
  wgEnableExpiresTime: false,
  wgEnableOneTimeLinks: false,
  wgEnableSortClients: false,
  prometheus: {
    enabled: false,
    password: null,
  },
  sessionConfig: {
    password: getRandomHex(256),
    name: 'wg-easy',
    cookie: undefined,
  },
};

export default DEFAULT_SYSTEM_MODEL;
