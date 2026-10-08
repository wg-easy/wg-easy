import { readFile, access } from 'node:fs/promises';

import { describe, expect, test, vi } from 'vitest';

import { buildAwgLines, interfaceAwgParameters } from '#server/utils/awg';
import {
  detectAwgVersion,
  type AwgCommand,
} from '#server/utils/awgCapabilities';
import { generateAwgProfile } from '#server/utils/awgProfile';
import {
  assertAwgParameters,
  parseAwgAutoGenerate,
  parseAwgVersion,
  type AwgVersion,
} from '#server/utils/awgProtocol';

describe('AWG environment settings', () => {
  test.each([
    [undefined, 'latest'],
    ['', 'latest'],
    ['latest', 'latest'],
    ['2', '2.0'],
    ['2.0', '2.0'],
    ['3', '3.0'],
    ['3.0', '3.0'],
    [' 3.1 ', '3.1'],
  ])('parses %s as %s', (input, expected) => {
    expect(parseAwgVersion(input)).toBe(expected);
  });
  test.each(['1', '3.2', 'auto', 'false'])(
    'rejects invalid version %s',
    (input) => {
      expect(() => parseAwgVersion(input)).toThrow('AWG_PROTOCOL_VERSION');
    }
  );
  test('generation is opt-in and rejects typos', () => {
    expect(parseAwgAutoGenerate(undefined)).toBe(false);
    expect(parseAwgAutoGenerate('false')).toBe(false);
    expect(parseAwgAutoGenerate('true')).toBe(true);
    expect(() => parseAwgAutoGenerate('yes')).toThrow('AWG_AUTO_GENERATE');
  });
});

describe('AWG version constraints', () => {
  test.each(['2.0', '3.0', '3.1'] as const)(
    'exports only supported parameters for %s',
    (version) => {
      const profile = generateAwgProfile('3.1');
      const exported = buildAwgLines(
        interfaceAwgParameters({
          ...profile.parameters,
          awgProtocolVersion: version,
        })
      ).join('\n');
      expect(exported.includes('HeaderProtectionKey')).toBe(version !== '2.0');
      expect(exported.includes('RandomTrailers')).toBe(version === '3.1');
      expect(exported.includes('DisableCookies')).toBe(version === '3.1');
      expect(exported).toContain('H4 =');
    }
  );
  test('rejects unsupported parameters including explicit false and defaults', () => {
    expect(() => assertAwgParameters('3.0', { disableCookies: false })).toThrow(
      'DisableCookies'
    );
    expect(() =>
      assertAwgParameters('2.0', { defaultRekeyTimeout: '0' })
    ).toThrow('RekeyTimeout');
    expect(() =>
      assertAwgParameters('2.0', { disableCookies: null })
    ).not.toThrow();
    expect(() =>
      assertAwgParameters(null, { disableCookies: true })
    ).not.toThrow();
  });
  test('generates distinct keys and headers with matching shared padding', () => {
    const first = generateAwgProfile('3.1');
    const second = generateAwgProfile('3.1');
    expect(first.parameters.headerProtectionKey).not.toBe(
      second.parameters.headerProtectionKey
    );
    const { s1, s2, s3, s4, h1, h2, h3, h4 } = first.parameters;
    expect(new Set([h1, h2, h3, h4]).size).toBe(4);
    expect(new Set([s1, s2, s3, s4]).size).toBe(1);
    expect(s1).toBeGreaterThanOrEqual(12);
    expect(first.defaults.defaultDisableCookies).toBe(false);
    expect(first.parameters.i1).toBeNull();
  });
});

/** Models an old module silently ignoring newer attributes. No host interfaces. */
function simulatedModule(
  supported: AwgVersion,
  options?: {
    setError?: boolean;
    addError?: boolean;
    deleteError?: boolean;
    collapseKeepalive?: boolean;
  }
) {
  const files: string[] = [];
  const names = new Set<string>();
  let configuration = '';
  const run = vi.fn<AwgCommand>(async (file, args) => {
    if (file === 'ip') {
      if (args[1] === 'add') {
        if (options?.addError) throw new Error('not permitted');
        names.add(args[3]!);
      } else {
        if (options?.deleteError) throw new Error('delete failed');
        names.delete(args[3]!);
      }
      return '';
    }
    if (args[0] === 'setconf') {
      files.push(args[2]!);
      if (options?.setError) throw new Error('secret key in tool error');
      const input = await readFile(args[2]!, 'utf8');
      configuration = input
        .split('\n')
        .filter((line) => {
          if (supported !== '3.1' && /RandomTrailers|DisableCookies/.test(line))
            return false;
          if (
            supported === '2.0' &&
            /HeaderProtectionKey|ContentPaddingAddition|Rekey|RejectAfter|KeepaliveTimeout|MaxHandshake/.test(
              line
            )
          )
            return false;
          return true;
        })
        .join('\n');
      return '';
    }
    return options?.collapseKeepalive
      ? configuration.replace(
          'PersistentKeepalive = 20-30',
          'PersistentKeepalive = 20'
        )
      : configuration;
  });
  return { run, files, names };
}

describe('AWG tools and kernel capability detection', () => {
  test.each(['2.0', '3.0', '3.1'] as const)(
    'latest selects %s from verified readback',
    async (supported) => {
      const mock = simulatedModule(supported);
      expect(await detectAwgVersion('latest', mock.run)).toBe(supported);
      expect(mock.names.size).toBe(0);
      for (const file of mock.files)
        await expect(access(file)).rejects.toThrow();
      expect(
        mock.run.mock.calls.every(
          ([file, args]) => file !== 'ip' || !args.includes('up')
        )
      ).toBe(true);
    }
  );
  test('explicit versions fail without downgrade and clean up', async () => {
    const mock = simulatedModule('3.0');
    await expect(detectAwgVersion('3.1', mock.run)).rejects.toThrow(
      'not supported'
    );
    expect(mock.files).toHaveLength(1);
    expect(mock.names.size).toBe(0);
    await expect(access(mock.files[0]!)).rejects.toThrow();
  });
  test('tool failures clean up and do not expose keys', async () => {
    const mock = simulatedModule('3.1', { setError: true });
    await expect(detectAwgVersion('3.1', mock.run)).rejects.toThrow(
      'AWG 3.1 is not supported'
    );
    expect(mock.names.size).toBe(0);
    await expect(access(mock.files[0]!)).rejects.toThrow();
  });
  test('failed creation never deletes an interface it does not own', async () => {
    const mock = simulatedModule('3.1', { addError: true });
    await expect(detectAwgVersion('latest', mock.run)).rejects.toThrow(
      'NET_ADMIN'
    );
    expect(mock.run).toHaveBeenCalledOnce();
  });
  test('rejects a module that collapses keepalive ranges to a scalar', async () => {
    const mock = simulatedModule('3.1', { collapseKeepalive: true });
    await expect(detectAwgVersion('3.1', mock.run)).rejects.toThrow(
      'not supported'
    );
    expect(mock.names.size).toBe(0);
    await expect(access(mock.files[0]!)).rejects.toThrow();
  });
  test('cleanup failure stops detection', async () => {
    const mock = simulatedModule('3.1', { deleteError: true });
    await expect(detectAwgVersion('latest', mock.run)).rejects.toThrow(
      'Cannot remove'
    );
    await expect(access(mock.files[0]!)).rejects.toThrow();
  });
});
