import type { SessionConfig } from 'h3';
import type { DeepReadonly } from 'vue';

export type WGHooks = {
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

export type Prometheus = {
  enabled: boolean;
  password: string | null;
};

export type Metrics = {
  prometheus: Prometheus;
};

export type General = {
  sessionTimeout: number;
};

export type System = {
  general: General;

  interface: WGInterface;

  userConfig: WGConfig;

  hooks: WGHooks;

  metrics: Metrics;

  sessionConfig: SessionConfig;
};

export type UpdateWGInterface = Omit<
  WGInterface,
  'privateKey' | 'publicKey' | 'address4' | 'address6'
>;

export type UpdateWGConfig = Omit<WGConfig, 'address4Range' | 'address6Range'>;

/**
 * Interface for system-related database operations.
 * This interface provides methods for retrieving system configuration data
 * and specific system properties, such as the language setting, from the database.
 */
export abstract class SystemRepository {
  abstract get(): Promise<DeepReadonly<System>>;

  abstract updateClientsHostPort(host: string, port: number): Promise<void>;

  abstract updateGeneral(general: General): Promise<void>;

  abstract updateInterface(wgInterface: UpdateWGInterface): Promise<void>;

  abstract updateUserConfig(userConfig: UpdateWGConfig): Promise<void>;

  abstract updateHooks(hooks: WGHooks): Promise<void>;
}
