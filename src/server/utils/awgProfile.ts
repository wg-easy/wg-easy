import { randomBytes, randomInt } from 'node:crypto';

import type { AwgInterface } from '#server/utils/awg';
import type { AwgVersion } from '#server/utils/awgProtocol';
import type { UserConfigUpdateType } from '#db/repositories/userConfig/types';

export function generateAwgProfile(version: AwgVersion) {
  const headers = new Set<number>();
  while (headers.size < 4) headers.add(randomInt(5, 2 ** 31));
  const [h1, h2, h3, h4] = [...headers].map(String);
  const padding = randomInt(12, 33);
  const jC = randomInt(4, 7);
  const jMin = randomInt(40, 90);
  const jMax = jMin + randomInt(50, 251);
  const modern = version !== '2.0';

  const parameters = {
    jC,
    jMin,
    jMax,
    s1: padding,
    s2: padding,
    s3: padding,
    s4: padding,
    h1: h1!,
    h2: h2!,
    h3: h3!,
    h4: h4!,
    i1: null,
    i2: null,
    i3: null,
    i4: null,
    i5: null,
    headerProtectionKey: modern ? randomBytes(32).toString('base64') : null,
    contentPaddingAddition: modern ? '10-100' : null,
    rekeyAfterTime: modern ? '100-120' : null,
    rekeyTimeout: modern ? '3-7' : null,
    rejectAfterTime: modern ? '150-180' : null,
    keepaliveTimeout: modern ? '5-15' : null,
    maxHandshakeAttempts: modern ? '15-20' : null,
    randomTrailers: version === '3.1' ? true : null,
    disableCookies: version === '3.1' ? false : null,
  } satisfies AwgInterface;

  const defaults = {
    defaultJC: jC,
    defaultJMin: jMin,
    defaultJMax: jMax,
    defaultI1: null,
    defaultI2: null,
    defaultI3: null,
    defaultI4: null,
    defaultI5: null,
    defaultContentPaddingAddition: parameters.contentPaddingAddition,
    defaultRekeyAfterTime: parameters.rekeyAfterTime,
    defaultRekeyTimeout: parameters.rekeyTimeout,
    defaultRejectAfterTime: parameters.rejectAfterTime,
    defaultKeepaliveTimeout: parameters.keepaliveTimeout,
    defaultMaxHandshakeAttempts: parameters.maxHandshakeAttempts,
    defaultDisableCookies: parameters.disableCookies,
  } satisfies Partial<UserConfigUpdateType>;

  return { parameters, defaults };
}

export type AwgProfile = ReturnType<typeof generateAwgProfile>;
