import { beforeAll, describe, expect, test } from 'vitest';

declare global {
  var t: (value: string) => string;
}

let GeneralUpdateSchema: typeof import('../../server/database/repositories/general/types').GeneralUpdateSchema;

beforeAll(async () => {
  globalThis.t = (value: string) => value;
  ({ GeneralUpdateSchema } = await import(
    '../../server/database/repositories/general/types'
  ));
});

describe('GeneralUpdateSchema', () => {
  test('requires a metrics password when metrics are enabled', async () => {
    await expect(
      GeneralUpdateSchema.parseAsync({
        sessionTimeout: 60,
        metricsPrometheus: true,
        metricsJson: false,
        metricsPassword: null,
      })
    ).rejects.toThrow();
  });

  test('allows disabling metrics without a password', async () => {
    await expect(
      GeneralUpdateSchema.parseAsync({
        sessionTimeout: 60,
        metricsPrometheus: false,
        metricsJson: false,
        metricsPassword: null,
      })
    ).resolves.toEqual({
      sessionTimeout: 60,
      metricsPrometheus: false,
      metricsJson: false,
      metricsPassword: null,
    });
  });
});
