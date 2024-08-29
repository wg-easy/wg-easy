export type Undefined = null | undefined | 0 | '';
export enum Lang {
  /* english */
  EN = 'en',
  /* french */
  FR = 'fr',
}
export type String = string;
export type Number = number;
export type ID = String | Number;
export type Boolean = boolean;
export type Version = String;
export type SessionTimeOut = Number;
export type Port = Number;
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
  mtu: Number;
  persistentKeepalive: Number;
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
  enabled: Boolean;
  type: ChartType;
};
export type Prometheus = {
  enabled: Boolean;
  password?: HashPassword | Undefined;
};
/**
 * `id` of T or T.
 *
 * @template T - The specific type that can be used in place of id String.
 */
export type Identity<T> = ID | T;
