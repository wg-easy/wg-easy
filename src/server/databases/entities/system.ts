import type { SessionConfig } from 'h3';
import type { Undefined } from '../database';

export type Lang = 'en' | 'ua' | 'ru' | 'tr' | 'no' | 'pl' | 'fr';
export type Version = string;
export type SessionTimeOut = number;
export type Port = number;
export type Address = string;
export type PassordHash = string;
export type Command = string;
export type Key = string;
export type IpTables = {
  wgPreUp: Command;
  wgPostUp: Command;
  wgPreDown: Command;
  wgPostDown: Command;
};
export type WGInterface = {
  privateKey: Key;
  publicKey: Key;
  address: Address;
};
export type WGConfig = {
  mtu: number;
  persistentKeepalive: number;
  rangeAddress: Address;
  defaultDns: Array<Address>;
  allowedIps: Array<Address>;
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
  password?: PassordHash | Undefined;
};

/**
 * Representing the WireGuard network configuration data structure of a computer interface system.
 */
type System = {
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

export default System;
