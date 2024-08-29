export type Undefined = null | undefined | 0 | '';
export enum Lang {
  /* english */
  EN = 'en',
  /* french */
  FR = 'fr',
}
export type String = string;
export type ID = String;
export type Boolean = boolean;
export type Version = String;
export type SessionTimeOut = number;
export type Port = number;
export type Address = String;
export type HashPassword = String;
export type Command = String;
export type Key = String;
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
/**
 * `id` of T or T.
 *
 * @template T - The specific type that can be used in place of id String.
 */
export type Identity<T> = ID | T;
