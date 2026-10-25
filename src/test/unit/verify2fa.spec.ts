import type { IncomingMessage, ServerResponse } from 'node:http';

import { createEvent } from 'h3';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import verify2fa from '#server/api/auth/verify-2fa.post';
import { useWGSession } from '#server/utils/session';

vi.mock('#server/utils/Database', () => ({
  default: {
    general: {
      getSessionConfig: async () => ({
        sessionPassword: '0123456789abcdef0123456789abcdef',
        sessionTimeout: 3600,
      }),
    },
    users: {
      validateTotpCode: async () => 'success',
    },
  },
}));

vi.mock('#server/utils/config', () => ({
  WG_ENV: { INSECURE: true },
}));

vi.mock('#server/utils/securityLogger', () => ({
  logSecurityEvent: () => undefined,
}));

describe('verify 2FA remember me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('keeps the persistent cookie when the password step asked to remember', async () => {
    const cookie = await loginCookie(true);

    const event = createAuthEvent(cookie);
    await verify2fa(event);

    expect(setCookieHeader(event)).toMatch(/Max-Age=3600/i);
  });

  test('leaves a session cookie when remember was not set', async () => {
    const cookie = await loginCookie(false);

    const event = createAuthEvent(cookie);
    await verify2fa(event);

    expect(setCookieHeader(event)).not.toMatch(/Max-Age=/i);
  });
});

async function loginCookie(remember: boolean) {
  const event = createAuthEvent();
  const session = await useWGSession(event, remember);
  await session.update({
    pendingLogin: {
      type: 'password',
      userId: 1,
      remember,
      expires_at: Date.now() + 5 * 60 * 1000,
    },
  });
  const pair = setCookieHeader(event).split(';')[0];
  if (!pair) {
    throw new Error('login did not set a session cookie');
  }
  return pair;
}

function setCookieHeader(event: H3EventLike) {
  const header = event.node.res.getHeader('set-cookie');
  if (Array.isArray(header)) {
    return header[header.length - 1] ?? '';
  }
  return header ? String(header) : '';
}

type H3EventLike = ReturnType<typeof createEvent>;

function createAuthEvent(cookie?: string) {
  const headers: IncomingMessage['headers'] = {
    'content-type': 'application/json',
  };
  if (cookie) {
    headers.cookie = cookie;
  }

  const request = {
    method: 'POST',
    url: '/api/auth/verify-2fa',
    headers,
    body: { totpCode: '123456' },
    socket: { remoteAddress: '127.0.0.1' },
    connection: {},
  } as unknown as IncomingMessage;

  const sent = new Map<string, string | string[]>();
  const response = {
    getHeader(name: string) {
      return sent.get(name.toLowerCase());
    },
    setHeader(name: string, value: string | string[]) {
      sent.set(name.toLowerCase(), value);
    },
    removeHeader(name: string) {
      sent.delete(name.toLowerCase());
    },
    appendHeader(name: string, value: string) {
      const current = sent.get(name.toLowerCase());
      if (current === undefined) {
        sent.set(name.toLowerCase(), value);
        return;
      }
      sent.set(
        name.toLowerCase(),
        Array.isArray(current) ? [...current, value] : [current, value]
      );
    },
  } as unknown as ServerResponse;

  return createEvent(request, response);
}
