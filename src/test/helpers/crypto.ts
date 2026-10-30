import { vi } from 'vitest';

const { password, totp } = vi.hoisted(() => ({
  password: {
    hashPassword: vi.fn(async (value: string) => `hash:${value}`),
    isPasswordValid: vi.fn(
      async (value: string, hash: string | null) => hash === `hash:${value}`
    ),
    isValidPasswordHash: vi.fn((value: string) => value.startsWith('hash:')),
  },
  totp: {
    createTotp: vi.fn((username: string) => ({
      key: 'test-secret',
      uri: `otpauth://totp/${username}`,
    })),
    verifyTotpCode: vi.fn(
      (_username: string, _key: string, code: string) => code === '123456'
    ),
  },
}));

vi.mock('#server/utils/password', () => password);
vi.mock('#server/utils/totp', () => totp);

export function resetCryptoMocks() {
  const mocks = { ...password, ...totp };
  for (const mock of Object.values(mocks)) mock.mockReset();
  return mocks;
}
