import packageJson from '@/package.json';

import type { SessionConfig } from 'h3';
import type { Lang } from './types';

export type IpTables = {
  PreUp: string;
  PostUp: string;
  PreDown: string;
  PostDown: string;
};

export type WGInterface = {
  privateKey: string;
  publicKey: string;
  address: string;
};

export type WGConfig = {
  mtu: number;
  persistentKeepalive: number;
  rangeAddress: string;
  defaultDns: string[];
  allowedIps: string[];
};

export enum ChartType {
  None = 0,
  Line = 1,
  Area = 2,
  Bar = 3,
}

export type TrafficStats = {
  enabled: boolean;
  type: ChartType;
};

export type Prometheus = {
  enabled: boolean;
  password: string | null;
};

export type Feature = {
  enabled: boolean;
};

/**
 * Representing the WireGuard network configuration data structure of a computer interface system.
 */
export type System = {
  interface: WGInterface;

  release: string;
  // maxAge
  sessionTimeout: number;
  lang: Lang;

  userConfig: WGConfig;

  wgPath: string;
  wgDevice: string;
  wgHost: string;
  wgPort: number;
  wgConfigPort: number;

  iptables: IpTables;
  trafficStats: TrafficStats;

  clientExpiration: Feature;
  oneTimeLinks: Feature;
  sortClients: Feature;

  prometheus: Prometheus;
  sessionConfig: SessionConfig;
};

/**
 * Interface for system-related database operations.
 * This interface provides methods for retrieving system configuration data
 * and specific system properties, such as the language setting, from the database.
 */
export interface SystemRepository {
  /**
   * Retrieves the system configuration data from the database.
   */
  getSystem(): Promise<System | null>;

  /**
   * Retrieves the system's language setting.
   */
  getLang(): Promise<Lang>;
}

// TODO: move to migration
export const DEFAULT_SYSTEM: System = {
  release: packageJson.release.version,
  interface: {
    privateKey: '',
    publicKey: '',
    address: '10.8.0.1',
  },
  sessionTimeout: 3600, // 1 hour
  lang: 'en',
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
    PreUp: '',
    PostUp: '',
    PreDown: '',
    PostDown: '',
  },
  trafficStats: {
    enabled: false,
    type: ChartType.None,
  },
  clientExpiration: {
    enabled: false,
  },
  oneTimeLinks: {
    enabled: false,
  },
  sortClients: {
    enabled: false,
  },
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
