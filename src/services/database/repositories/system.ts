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
  address4: string;
  address6: string;
  mtu: number;
  port: number;
  device: string;
};

export type WGConfig = {
  mtu: number;
  persistentKeepalive: number;
  address4Range: string;
  address6Range: string;
  defaultDns: string[];
  allowedIps: string[];
  host: string;
  port: number;
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

export type Metrics = {
  prometheus: Prometheus;
};

export type General = {
  sessionTimeout: number;
  lang: Lang;
};

/**
 * Representing the WireGuard network configuration data structure of a computer interface system.
 */
export type System = {
  interface: WGInterface;
  general: General;
  userConfig: WGConfig;

  iptables: IpTables;

  trafficStats: TrafficStats;
  metrics: Metrics;

  clientExpiration: Feature;
  oneTimeLinks: Feature;
  sortClients: Feature;

  sessionConfig: SessionConfig;
};

export const Features = [
  'clientExpiration',
  'oneTimeLinks',
  'sortClients',
] as const;

export type Features = (typeof Features)[number];

/**
 * Interface for system-related database operations.
 * This interface provides methods for retrieving system configuration data
 * and specific system properties, such as the language setting, from the database.
 */
export abstract class SystemRepository {
  /**
   * Retrieves the system configuration data from the database.
   */
  abstract get(): Promise<System>;

  abstract updateFeatures(features: Record<string, Feature>): Promise<void>;
}
