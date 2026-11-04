import { describe, expect, test, vi } from 'vitest';
import { getValidatedQuery, readValidatedBody } from 'nuxt/server';

import { requestEvent } from '../helpers/request';

import { getValidatedRouterParams, validateZod } from '#server/http/validation';
import { ClientGetSchema, ClientQuerySchema } from '#shared/contracts/client';
import { UserLoginSchema } from '#shared/contracts/user';

vi.mock('#server/http/translation', () => ({
  useRequestTranslation: async () => () => 'Translated validation message',
}));

const validationError = {
  status: 400,
  statusText: 'Validation Error',
  message: 'Translated validation message',
};

function clientRequest(clientId: string) {
  const event = requestEvent(`https://vpn.example/api/client/${clientId}`);
  event.context.params = { clientId };
  return event;
}

describe('request validation', () => {
  test('accepts an encoded client ID after decoding and schema coercion', async () => {
    const event = clientRequest('%31');
    await expect(
      getValidatedRouterParams(event, validateZod(ClientGetSchema, event))
    ).resolves.toEqual({ clientId: 1 });
  });

  test.each(['bad', '%2F', '%2531'])(
    'rejects invalid or double-encoded client ID %s with a translated error',
    async (clientId) => {
      const event = clientRequest(clientId);
      await expect(
        getValidatedRouterParams(event, validateZod(ClientGetSchema, event))
      ).rejects.toMatchObject(validationError);
    }
  );

  test.each(['%', '%FF'])(
    'reports malformed escape or UTF-8 input %s as a client error',
    async (clientId) => {
      const event = clientRequest(clientId);
      await expect(
        getValidatedRouterParams(event, validateZod(ClientGetSchema, event))
      ).rejects.toMatchObject({
        status: 400,
        statusText: 'Validation Error',
        message: 'Malformed route parameter encoding',
      });
    }
  );

  test('preserves translated login validation through body parsing', async () => {
    const event = requestEvent('https://vpn.example/api/auth/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: '',
        remember: false,
      }),
    });
    await expect(
      readValidatedBody(event, validateZod(UserLoginSchema, event))
    ).rejects.toMatchObject(validationError);
  });

  test('preserves translated pagination validation through query parsing', async () => {
    const event = requestEvent('https://vpn.example/api/client?page=0');
    await expect(
      getValidatedQuery(event, validateZod(ClientQuerySchema, event))
    ).rejects.toMatchObject(validationError);
  });
});
