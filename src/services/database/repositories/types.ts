import type * as crypto from 'node:crypto';

export enum Lang {
  /* english */
  EN = 'en',
  /* french */
  FR = 'fr',
}

export type Ipv4 = `${number}.${number}.${number}.${number}`;
export type Ipv4CIDR = `${number}.${number}.${number}.${number}/${number}`;
export type Ipv6 =
  `${string}:${string}:${string}:${string}:${string}:${string}:${string}:${string}`;
export type Ipv6CIDR =
  `${string}:${string}:${string}:${string}:${string}:${string}:${string}:${string}/${number}`;

export type Address = Ipv4 | Ipv4CIDR | Ipv6 | Ipv6CIDR | '::/0';

export type UrlHttp = `http://${string}`;
export type UrlHttps = `https://${string}`;
export type Url = string | UrlHttp | UrlHttps | Address;

export type ID = crypto.UUID;
export type Version = string;
export type SessionTimeOut = number;
export type Port = number;
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
  password: HashPassword | null;
};
