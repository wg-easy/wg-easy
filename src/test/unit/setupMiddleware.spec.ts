import { beforeEach, describe, expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';

import setupMiddleware from '#server/middleware/setup';
import { status } from '#server/features/setup';

vi.mock('#server/features/setup', () => ({ status: vi.fn() }));

beforeEach(() => {
  vi.mocked(status).mockReset();
});

describe('setup redirects with portable request events', () => {
  test.each(['/api/auth/methods', '/_i18n/en/messages.json'])(
    'passes %s through without reading setup state',
    async (path) => {
      expect(
        await setupMiddleware(requestEvent(`https://vpn.example${path}`))
      ).toBeUndefined();
      expect(status).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['/', 1, '/setup/1'],
    ['/setup/1', 3, '/setup/3'],
    ['/setup/3', 1, '/setup/1'],
    ['/setup/migrate', 1, '/setup/1'],
    ['/login', 1, '/setup/1'],
    ['/', 3, '/setup/3'],
    ['/setup/2', 3, '/setup/3'],
  ])('redirects %s at step %i to %s', async (path, step, location) => {
    vi.mocked(status).mockResolvedValue({ step, done: false });
    const event = requestEvent(`https://vpn.example${path}`);
    const body = await setupMiddleware(event);
    expect(event.res.status).toBe(302);
    expect(event.res.headers.get('location')).toBe(location);
    expect(body).toContain(location);
  });

  test.each([
    ['/setup/1', 1],
    ['/setup/2', 1],
    ['/login', 3],
    ['/login/2fa', 3],
    ['/setup/3', 3],
    ['/setup/4', 3],
    ['/setup/migrate', 3],
  ] as const)('allows %s at step %i', async (path, step) => {
    vi.mocked(status).mockResolvedValue({ step, done: false });
    const event = requestEvent(`https://vpn.example${path}`);
    expect(await setupMiddleware(event)).toBeUndefined();
    expect(event.res.headers.has('location')).toBe(false);
  });

  test('redirects completed setup to the dashboard and allows other pages', async () => {
    vi.mocked(status).mockResolvedValue({ step: 0, done: true });
    const event = requestEvent('https://vpn.example/setup/1');
    await setupMiddleware(event);
    expect(event.res.status).toBe(302);
    expect(event.res.headers.get('location')).toBe('/');
    expect(
      await setupMiddleware(requestEvent('https://vpn.example/'))
    ).toBeUndefined();
  });
});
