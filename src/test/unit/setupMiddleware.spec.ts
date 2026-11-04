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
  ])('redirects %s at step %i to %s', async (path, step, location) => {
    vi.mocked(status).mockResolvedValue({ step, done: false });
    const event = requestEvent(`https://vpn.example${path}`);
    const body = await setupMiddleware(event);
    expect(event.res.status).toBe(302);
    expect(event.res.headers.get('location')).toBe(location);
    expect(body).toContain(location);
  });

  test('allows the current setup step', async () => {
    vi.mocked(status).mockResolvedValue({ step: 3, done: false });
    const event = requestEvent('https://vpn.example/setup/3');
    expect(await setupMiddleware(event)).toBeUndefined();
    expect(event.res.headers.has('location')).toBe(false);
  });

  test('redirects completed setup to login and allows other pages', async () => {
    vi.mocked(status).mockResolvedValue({ step: 0, done: true });
    const event = requestEvent('https://vpn.example/setup/1');
    expect(await setupMiddleware(event)).toContain('/login');
    expect(event.res.status).toBe(302);
    expect(event.res.headers.get('location')).toBe('/login');
    expect(
      await setupMiddleware(requestEvent('https://vpn.example/'))
    ).toBeUndefined();
  });
});
