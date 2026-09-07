import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';

/**
 * A parameter written as `Key = value` into the `[Interface]` section of a
 * configuration file. `null` means "not set" and is left out entirely.
 */
type AwgParameters = Record<string, string | number | boolean | null>;

type AwgInterface = Pick<
  InterfaceType,
  | 'jC'
  | 'jMin'
  | 'jMax'
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'i1'
  | 'i2'
  | 'i3'
  | 'i4'
  | 'i5'
  | 'headerProtectionKey'
  | 'contentPaddingAddition'
  | 'rekeyAfterTime'
  | 'rekeyTimeout'
  | 'rejectAfterTime'
  | 'keepaliveTimeout'
  | 'maxHandshakeAttempts'
  | 'randomTrailers'
  | 'disableCookies'
>;

type AwgClient = Pick<
  ClientType,
  | 'jC'
  | 'jMin'
  | 'jMax'
  | 'i1'
  | 'i2'
  | 'i3'
  | 'i4'
  | 'i5'
  | 'contentPaddingAddition'
  | 'rekeyAfterTime'
  | 'rekeyTimeout'
  | 'rejectAfterTime'
  | 'keepaliveTimeout'
  | 'maxHandshakeAttempts'
  | 'disableCookies'
>;

/**
 * amneziawg-tools parses booleans with `parse_bool`, which only accepts
 * `on`, `off` or a plain number - not `true` / `false`.
 */
function formatBoolean(value: boolean) {
  return value ? 'on' : 'off';
}

export function buildAwgLines(parameters: AwgParameters) {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'boolean') {
      lines.push(`${key} = ${formatBoolean(value)}`);
      continue;
    }

    if (!value) continue;

    lines.push(`${key} = ${value}`);
  }

  return lines;
}

/** Obfuscation parameters for the server's own interface */
export function interfaceAwgParameters(
  wgInterface: AwgInterface
): AwgParameters {
  return {
    Jc: wgInterface.jC,
    Jmin: wgInterface.jMin,
    Jmax: wgInterface.jMax,
    S1: wgInterface.s1,
    S2: wgInterface.s2,
    S3: wgInterface.s3,
    S4: wgInterface.s4,
    H1: wgInterface.h1,
    H2: wgInterface.h2,
    H3: wgInterface.h3,
    H4: wgInterface.h4,
    I1: wgInterface.i1,
    I2: wgInterface.i2,
    I3: wgInterface.i3,
    I4: wgInterface.i4,
    I5: wgInterface.i5,
    HeaderProtectionKey: wgInterface.headerProtectionKey,
    ContentPaddingAddition: wgInterface.contentPaddingAddition,
    RekeyAfterTime: wgInterface.rekeyAfterTime,
    RekeyTimeout: wgInterface.rekeyTimeout,
    RejectAfterTime: wgInterface.rejectAfterTime,
    KeepaliveTimeout: wgInterface.keepaliveTimeout,
    MaxHandshakeAttempts: wgInterface.maxHandshakeAttempts,
    RandomTrailers: wgInterface.randomTrailers,
    DisableCookies: wgInterface.disableCookies,
  };
}

/**
 * Obfuscation parameters for a client's interface.
 *
 * S1-S4, H1-H4, HeaderProtectionKey and RandomTrailers have to be identical on
 * both ends of the tunnel and are therefore copied from the server, everything
 * else may differ per client.
 */
export function clientAwgParameters(
  wgInterface: AwgInterface,
  client: AwgClient
): AwgParameters {
  return {
    Jc: client.jC,
    Jmin: client.jMin,
    Jmax: client.jMax,
    S1: wgInterface.s1,
    S2: wgInterface.s2,
    S3: wgInterface.s3,
    S4: wgInterface.s4,
    H1: wgInterface.h1,
    H2: wgInterface.h2,
    H3: wgInterface.h3,
    H4: wgInterface.h4,
    I1: client.i1,
    I2: client.i2,
    I3: client.i3,
    I4: client.i4,
    I5: client.i5,
    HeaderProtectionKey: wgInterface.headerProtectionKey,
    ContentPaddingAddition: client.contentPaddingAddition,
    RekeyAfterTime: client.rekeyAfterTime,
    RekeyTimeout: client.rekeyTimeout,
    RejectAfterTime: client.rejectAfterTime,
    KeepaliveTimeout: client.keepaliveTimeout,
    MaxHandshakeAttempts: client.maxHandshakeAttempts,
    RandomTrailers: wgInterface.randomTrailers,
    DisableCookies: client.disableCookies,
  };
}
