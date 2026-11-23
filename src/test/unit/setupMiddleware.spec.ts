import { expect, test, vi } from 'vitest';

import { requestEvent } from '../helpers/request';

import setupMiddleware from '#server/middleware/setup';
import { status } from '#server/features/setup';

vi.mock('#server/features/setup', () => ({ status: vi.fn() }));

test.each(['/api/auth/methods', '/_i18n/en/messages.json'])(
  'passes %s through without reading setup state',
  async (path) => {
    vi.mocked(status).mockClear();
    await setupMiddleware(requestEvent(`https://vpn.example${path}`));
    expect(status).not.toHaveBeenCalled();
  }
);

test.each([
  ['/', 1, '/setup/1'],
  ['/setup/2', 1, null],
  ['/setup/migrate', 1, '/setup/1'],
  ['/metrics/json', 3, '/setup/3'],
  ['/setup/2', 3, '/setup/3'],
  ['/login/2fa', 3, null],
  ['/setup/migrate', 3, null],
  ['/setup/1', 0, '/'],
  ['/', 0, null],
] as const)(
  'visiting %s at step %i sends Location %s',
  async (path, step, location) => {
    vi.mocked(status).mockResolvedValue({ step, done: step === 0 });
    const event = requestEvent(`https://vpn.example${path}`);
    await setupMiddleware(event);
    expect(event.res.headers.get('location')).toBe(location);
  }
);
