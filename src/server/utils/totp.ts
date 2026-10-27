import { Secret, TOTP } from 'otpauth';

function totp(username: string, secret: Secret | string) {
  return new TOTP({
    issuer: 'wg-easy',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
}

export function createTotp(username: string) {
  const key = new Secret({ size: 20 });
  return { key: key.base32, uri: totp(username, key).toString() };
}

export function verifyTotpCode(username: string, key: string, code: string) {
  return totp(username, key).validate({ token: code, window: 1 }) !== null;
}
