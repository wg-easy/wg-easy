import { afterEach, describe, expect, test, vi } from 'vitest';

import { copyText } from '../../app/utils/copyText';

type FakeTextarea = {
  value: string;
  style: Record<string, string>;
  setAttribute: () => void;
  focus: () => void;
  select: () => void;
  remove: () => void;
};

function fakeDom({ dialog = false } = {}) {
  const appended: { host: string; textarea: FakeTextarea }[] = [];
  const removed: FakeTextarea[] = [];
  const makeHost = (name: string) => ({
    appendChild: (textarea: FakeTextarea) =>
      appended.push({ host: name, textarea }),
  });
  const document = {
    body: makeHost('body'),
    querySelector: (selector: string) =>
      selector === '[role="dialog"]' && dialog ? makeHost('dialog') : null,
    createElement: () => {
      const textarea: FakeTextarea = {
        value: '',
        style: {},
        setAttribute: () => {},
        focus: () => {},
        select: () => {},
        remove: () => removed.push(textarea),
      };
      return textarea;
    },
    execCommand: vi.fn(() => true),
  };
  vi.stubGlobal('document', document);
  return { document, appended, removed };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyText', () => {
  test('uses the Clipboard API in a secure context', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { document } = fakeDom();

    expect(await copyText('[Interface]')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('[Interface]');
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  test('falls back to execCommand over plain HTTP', async () => {
    vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('navigator', {});
    const { document, appended, removed } = fakeDom();

    expect(await copyText('[Interface]')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(appended).toHaveLength(1);
    expect(appended[0]?.host).toBe('body');
    expect(appended[0]?.textarea.value).toBe('[Interface]');
    expect(removed).toEqual([appended[0]?.textarea]);
  });

  test('puts the textarea inside an open dialog', async () => {
    vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('navigator', {});
    const { appended } = fakeDom({ dialog: true });

    await copyText('x');
    expect(appended[0]?.host).toBe('dialog');
  });

  test('falls back when the Clipboard API rejects', async () => {
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn(async () => Promise.reject(new Error('denied'))),
      },
    });
    const { document } = fakeDom();

    expect(await copyText('x')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  test('reports failure when copying is not possible', async () => {
    vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('navigator', {});
    const { document } = fakeDom();
    document.execCommand.mockImplementation(() => {
      throw new Error('not allowed');
    });

    expect(await copyText('x')).toBe(false);
  });
});
