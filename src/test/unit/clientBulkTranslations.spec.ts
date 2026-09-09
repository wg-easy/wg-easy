import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const clientBulkKeys = [
  'selectAll',
  'selectedCount',
  'enableSelected',
  'disableSelected',
  'enableSelectedDescription',
  'disableSelectedDescription',
] as const;

describe('bulk client translations', () => {
  test('provides every bulk-selection key in every locale', () => {
    const localesDirectory = resolve(process.cwd(), 'i18n/locales');
    const localeFiles = readdirSync(localesDirectory).filter((file) =>
      file.endsWith('.json')
    );

    for (const localeFile of localeFiles) {
      const locale = JSON.parse(
        readFileSync(resolve(localesDirectory, localeFile), 'utf8')
      );

      for (const key of clientBulkKeys) {
        expect(locale.client[key], `${localeFile}:${key}`).toEqual(
          expect.any(String)
        );
        expect(locale.client[key], `${localeFile}:${key}`).not.toBe('');
      }

      expect(
        locale.client.enableSelectedDescription,
        `${localeFile}:enableSelectedDescription`
      ).toContain('{0}');
      expect(
        locale.client.disableSelectedDescription,
        `${localeFile}:disableSelectedDescription`
      ).toContain('{0}');
    }
  });
});
