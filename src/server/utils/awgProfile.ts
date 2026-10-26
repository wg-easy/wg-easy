import { randomBytes, randomInt } from 'node:crypto';

import type { interfaceAwgParameters } from '#server/utils/awg';

/** Generate a profile for the latest supported protocol, AmneziaWG 3.1. */
export function generateAwgProfile() {
  const padding = randomInt(12, 33);
  const jC = randomInt(4, 7);
  const jMin = randomInt(40, 90);
  const jMax = jMin + randomInt(50, 251);
  const parameters = {
    jC,
    jMin,
    jMax,
    s1: padding,
    s2: padding,
    s3: padding,
    s4: padding,
    // Header protection hides the message types; use the standard headers.
    h1: null,
    h2: null,
    h3: null,
    h4: null,
    // CPS signatures must be chosen separately, rather than invented at random.
    i1: null,
    i2: null,
    i3: null,
    i4: null,
    i5: null,
    headerProtectionKey: randomBytes(32).toString('base64'),
    contentPaddingAddition: '10-100',
    rekeyAfterTime: '100-120',
    rekeyTimeout: '3-7',
    rejectAfterTime: '150-180',
    keepaliveTimeout: '5-15',
    maxHandshakeAttempts: '15-20',
    randomTrailers: true,
    disableCookies: false,
  } satisfies Parameters<typeof interfaceAwgParameters>[0];
  const defaults = { defaultJC: jC, defaultJMin: jMin, defaultJMax: jMax };
  const clientDefaults = {
    defaultContentPaddingAddition: parameters.contentPaddingAddition,
    defaultRekeyAfterTime: parameters.rekeyAfterTime,
    defaultRekeyTimeout: parameters.rekeyTimeout,
    defaultRejectAfterTime: parameters.rejectAfterTime,
    defaultKeepaliveTimeout: parameters.keepaliveTimeout,
    defaultMaxHandshakeAttempts: parameters.maxHandshakeAttempts,
    defaultDisableCookies: parameters.disableCookies,
  };
  return { parameters, defaults, clientDefaults };
}
export type AwgProfile = ReturnType<typeof generateAwgProfile>;
