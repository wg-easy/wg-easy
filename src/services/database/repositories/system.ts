import type { SessionConfig } from 'h3';

export type Lang = 'en' | 'fr';

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
  address6: string;
};

export type WGConfig = {
  mtu: number;
  persistentKeepalive: number;
  addressRange: string;
  addressRange6: string;
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

  // maxAge
  sessionTimeout: number;
  lang: Lang;

  userConfig: WGConfig;

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
  getSystem(): Promise<System>;
}
