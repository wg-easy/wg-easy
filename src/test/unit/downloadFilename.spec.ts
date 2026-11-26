import { describe, expect, test, vi } from 'vitest';

import { attachmentDisposition } from '#server/http/download';
import { filenames } from '#server/features/vpn/provisioning';

vi.mock('#server/utils/config', () => ({ OLD_ENV: {}, WG_ENV: {} }));

describe('client configuration filenames', () => {
  test('leaves ASCII names unchanged and adds no unicode filename', () => {
    expect(filenames('My Laptop', 1, false)).toEqual({
      filename: 'My-Laptop.conf',
      unicodeFilename: undefined,
    });
    expect(filenames('Router', 2, true)).toEqual({
      filename: 'Router.template.conf',
      unicodeFilename: undefined,
    });
  });

  test('keeps the existing ASCII fallback and adds a unicode filename', () => {
    expect(filenames('김수형의 MacBook Air', 3, false)).toEqual({
      filename: '-MacBook-Air.conf',
      unicodeFilename: '김수형의-MacBook-Air.conf',
    });
  });

  test('falls back to the client id when no ASCII characters remain', () => {
    expect(filenames('아이폰', 4, false)).toEqual({
      filename: '4.conf',
      unicodeFilename: '아이폰.conf',
    });
  });

  test('replaces characters that are unsafe in filenames', () => {
    expect(filenames('a/b"c\\d', 5, false).filename).toBe('a-b-c-d.conf');
    expect(filenames('집/"회사"', 6, false).unicodeFilename).toBe(
      '집-회사.conf'
    );
    expect(filenames('🙂🙂', 7, false)).toEqual({
      filename: '7.conf',
      unicodeFilename: undefined,
    });
  });

  test('truncates by code point', () => {
    const { unicodeFilename } = filenames('가'.repeat(40), 8, false);
    expect(unicodeFilename).toBe(`${'가'.repeat(32)}.conf`);
  });

  test('normalizes decomposed input to NFC', () => {
    const decomposed = '한글'.normalize('NFD');
    expect(filenames(decomposed, 9, false).unicodeFilename).toBe('한글.conf');
  });
});

describe('attachmentDisposition', () => {
  test('emits only filename when no unicode filename is given', () => {
    expect(attachmentDisposition('Router.conf')).toBe(
      'attachment; filename="Router.conf"'
    );
  });

  test('adds an RFC 8187 encoded filename*', () => {
    expect(
      attachmentDisposition('-MacBook-Air.conf', '김수형의-MacBook-Air.conf')
    ).toBe(
      'attachment; filename="-MacBook-Air.conf"; ' +
        "filename*=UTF-8''%EA%B9%80%EC%88%98%ED%98%95%EC%9D%98-MacBook-Air.conf"
    );
  });
});
