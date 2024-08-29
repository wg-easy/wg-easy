import type { SessionConfig } from 'h3';
import type {
  Address,
  IpTables,
  Lang,
  Port,
  Prometheus,
  SessionTimeOut,
  String,
  Boolean,
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
  webuiHost: String;
  // maxAge
  sessionTimeout: SessionTimeOut;
  lang: Lang;

  userConfig: WGConfig;

  wgPath: String;
  wgDevice: String;
  wgHost: Address;
  wgPort: Port;
  wgConfigPort: Port;

  iptables: IpTables;
  trafficStats: TrafficStats;

  wgEnableExpiresTime: Boolean;
  prometheus: Prometheus;
  sessionConfig: SessionConfig;
};
