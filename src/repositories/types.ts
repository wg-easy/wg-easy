import type * as crypto from 'node:crypto';

export type Undefined = null | undefined | 0 | '';
export enum Lang {
  /* english */
  EN = 'en',
  /* french */
  FR = 'fr',
}

export type ID = crypto.UUID;
export type Version = string;
export type SessionTimeOut = number;
export type Port = number;
export type Address = string;
export type HashPassword = string;
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
  password?: HashPassword | Undefined;
};
