import { describe, expect, test } from 'vitest';

import {
  buildAwgLines,
  clientAwgParameters,
  interfaceAwgParameters,
} from '#server/utils/awg';
import { InterfaceUpdateSchema } from '#db/repositories/interface/types';
import { AwgRangeSchema, HSchema, KeySchema } from '#server/utils/types';

/** Any valid 32 byte base64 key, generated with `wg genkey` */
const KEY = 'JPJ2DWzJbwrRkY6cPbZaJasL6bHQOM6J2Ollx4D/OHU=';

const wgInterface = {
  jC: 7,
  jMin: 10,
  jMax: 1000,
  s1: 128,
  s2: 56,
  s3: null,
  s4: null,
  h1: '5',
  h2: null,
  h3: null,
  h4: null,
  i1: null,
  i2: null,
  i3: null,
  i4: null,
  i5: null,
  headerProtectionKey: null,
  contentPaddingAddition: null,
  rekeyAfterTime: null,
  rekeyTimeout: null,
  rejectAfterTime: null,
  keepaliveTimeout: null,
  maxHandshakeAttempts: null,
  randomTrailers: null,
  disableCookies: null,
};

const client = {
  jC: null,
  jMin: null,
  jMax: null,
  i1: null,
  i2: null,
  i3: null,
  i4: null,
  i5: null,
  contentPaddingAddition: null,
  rekeyAfterTime: null,
  rekeyTimeout: null,
  rejectAfterTime: null,
  keepaliveTimeout: null,
  maxHandshakeAttempts: null,
  disableCookies: null,
};

describe('AmneziaWG config lines', () => {
  test('leaves out parameters that are not set', () => {
    expect(buildAwgLines({ Jc: null, Jmin: null })).toEqual([]);
  });

  test('writes booleans as on/off, not true/false', () => {
    expect(
      buildAwgLines({ RandomTrailers: true, DisableCookies: false })
    ).toEqual(['RandomTrailers = on', 'DisableCookies = off']);
  });

  test('keeps ranges verbatim', () => {
    expect(buildAwgLines({ RekeyAfterTime: '90-150' })).toEqual([
      'RekeyAfterTime = 90-150',
    ]);
  });

  test('builds the interface parameters', () => {
    expect(
      buildAwgLines(
        interfaceAwgParameters({
          ...wgInterface,
          headerProtectionKey: KEY,
          maxHandshakeAttempts: '5',
          randomTrailers: true,
          disableCookies: false,
        })
      )
    ).toEqual([
      'Jc = 7',
      'Jmin = 10',
      'Jmax = 1000',
      'S1 = 128',
      'S2 = 56',
      'H1 = 5',
      `HeaderProtectionKey = ${KEY}`,
      'MaxHandshakeAttempts = 5',
      'RandomTrailers = on',
      'DisableCookies = off',
    ]);
  });

  test('copies parameters that must match from the interface to the client', () => {
    const lines = buildAwgLines(
      clientAwgParameters(
        { ...wgInterface, headerProtectionKey: KEY, randomTrailers: true },
        { ...client, rekeyTimeout: '4-8', disableCookies: true }
      )
    );

    expect(lines).toContain(`HeaderProtectionKey = ${KEY}`);
    expect(lines).toContain('RandomTrailers = on');
    expect(lines).toContain('S1 = 128');
    expect(lines).toContain('H1 = 5');
    expect(lines).toContain('RekeyTimeout = 4-8');
    expect(lines).toContain('DisableCookies = on');
  });

  test('does not inherit per-client parameters from the interface', () => {
    const lines = buildAwgLines(
      clientAwgParameters(
        { ...wgInterface, jC: 7, maxHandshakeAttempts: '9' },
        client
      )
    );

    expect(lines).not.toContain('Jc = 7');
    expect(lines).not.toContain('MaxHandshakeAttempts = 9');
  });
});

describe('AwgRangeSchema', () => {
  test('accepts a single number and an inclusive range', () => {
    expect(AwgRangeSchema.parse('30')).toBe('30');
    expect(AwgRangeSchema.parse('30-90')).toBe('30-90');
    expect(AwgRangeSchema.parse(' 30 - 90 ')).toBe('30-90');
    expect(AwgRangeSchema.parse('0')).toBe('0');
    expect(AwgRangeSchema.parse(null)).toBeNull();
  });

  test('collapses a range with identical bounds', () => {
    expect(AwgRangeSchema.parse('30-30')).toBe('30');
  });

  test('rejects values the awg parser would truncate or refuse', () => {
    expect(() => AwgRangeSchema.parse('65536')).toThrow();
    expect(() => AwgRangeSchema.parse('90-30')).toThrow();
    expect(() => AwgRangeSchema.parse('-5')).toThrow();
    expect(() => AwgRangeSchema.parse('1-2-3')).toThrow();
    expect(() => AwgRangeSchema.parse('abc')).toThrow();
    expect(() => AwgRangeSchema.parse('')).toThrow();
  });

  test('does not change the H1-H4 bounds', () => {
    expect(HSchema.parse('5')).toBe('5');
    expect(() => HSchema.parse('4')).toThrow();
    expect(HSchema.parse('5-2147483647')).toBe('5-2147483647');
    expect(() => HSchema.parse('5-2147483648')).toThrow();
  });
});

describe('KeySchema', () => {
  test('accepts a 32 byte base64 key', () => {
    expect(KeySchema.parse(KEY)).toBe(KEY);
    expect(KeySchema.parse(null)).toBeNull();
  });

  test('rejects keys of the wrong length or encoding', () => {
    expect(() => KeySchema.parse('too-short')).toThrow();
    expect(() => KeySchema.parse(KEY.slice(0, -1))).toThrow();
    expect(() => KeySchema.parse(`${KEY}${KEY}`)).toThrow();
    // non canonical: the trailing bits of the last character are not zero
    expect(() => KeySchema.parse(`${KEY.slice(0, 42)}B=`)).toThrow();
  });

  test('rejects newlines that would inject extra config lines', () => {
    expect(() =>
      KeySchema.parse(`${KEY}\nPostUp = touch /tmp/pwned`)
    ).toThrow();
  });
});

describe('InterfaceUpdateSchema', () => {
  const base = {
    ipv4Cidr: '10.8.0.0/24',
    ipv6Cidr: 'fdcc:ad94:bacf:61a3::/64',
    mtu: 1420,
    routingTable: 'auto',
    ...wgInterface,
    port: 51820,
    device: 'eth0',
    enabled: true,
    firewallEnabled: false,
  };

  test('accepts an interface without header protection', () => {
    expect(() => InterfaceUpdateSchema.parse(base)).not.toThrow();
  });

  test('requires S1-S4 to be at least 12 when a key is set', () => {
    const result = InterfaceUpdateSchema.safeParse({
      ...base,
      headerProtectionKey: KEY,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      's3',
      's4',
    ]);
  });

  test('accepts header protection with large enough junk sizes', () => {
    expect(() =>
      InterfaceUpdateSchema.parse({
        ...base,
        headerProtectionKey: KEY,
        s3: 12,
        s4: 40,
      })
    ).not.toThrow();
  });
});
