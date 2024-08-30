import type { SessionConfig } from 'h3';
import type {
  Address,
  IpTables,
  Lang,
  Port,
  Prometheus,
  SessionTimeOut,
  TrafficStats,
  Version,
  WGConfig,
  WGInterface,
} from '../types';

/**
 * Representing the WireGuard network configuration data structure of a computer interface system.
 */
export type System = {
  interface: WGInterface;

  release: Version;
  port: number;
  webuiHost: string;
  // maxAge
  sessionTimeout: SessionTimeOut;
  lang: Lang;

  userConfig: WGConfig;

  wgPath: string;
  wgDevice: string;
  wgHost: Address;
  wgPort: Port;
  wgConfigPort: Port;

  iptables: IpTables;
  trafficStats: TrafficStats;

  wgEnableExpiresTime: boolean;
  prometheus: Prometheus;
  sessionConfig: SessionConfig;
};
