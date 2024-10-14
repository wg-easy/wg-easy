import type { SessionConfig } from 'h3';
import type { LOCALES } from '~~/i18n.config';

export type Lang = (typeof LOCALES)[number]['value'];

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

export type Statistics = {
  enabled: boolean;
  chartType: ChartType;
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

export type Features = {
  clientExpiration: Feature;
  oneTimeLinks: Feature;
  sortClients: Feature;
};

export const AvailableFeatures: (keyof Features)[] = [
  'clientExpiration',
  'oneTimeLinks',
  'sortClients',
] as const;

/**
 * Representing the WireGuard network configuration data structure of a computer interface system.
 */
export type System = {
  general: General;

  interface: WGInterface;

  userConfig: WGConfig;

  iptables: IpTables;

  features: Features;

  statistics: Statistics;

  metrics: Metrics;

  sessionConfig: SessionConfig;
};

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
  abstract updateStatistics(statistics: Statistics): Promise<void>;
  abstract updateLang(lang: Lang): Promise<void>;
  abstract updateClientsHostPort(host: string, port: number): Promise<void>;
}
