import { describe, expect, test, vi, onTestFinished } from 'vitest';

import { databaseFixture } from '../helpers/database';
import { resetCryptoMocks } from '../helpers/crypto';

import * as identity from '#server/features/identity';
import { WG_ENV } from '#server/utils/config';
import { roles } from '#shared/utils/permissions';
vi.mock('#server/utils/config', () => ({ WG_ENV: {} }));

const actor = { id: 1, role: roles.ADMIN };

async function fixture(
  options: { passwordEnabled?: boolean; oauthAutoRegister?: boolean } = {}
) {
  const { store } = await databaseFixture();
  const crypto = resetCryptoMocks();
  await store.users.insert({
    id: 1,
    username: 'admin',
    name: 'Admin',
    email: 'admin@example.com',
    password: 'hash:old-password',
    role: roles.ADMIN,
    enabled: true,
    totpVerified: false,
  });
  WG_ENV.DISABLE_PASSWORD_AUTH = options.passwordEnabled === false;
  WG_ENV.OAUTH_AUTO_REGISTER = options.oauthAutoRegister ?? false;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
  onTestFinished(() => clock.mockRestore());
  return { store, crypto };
}

describe('identity', () => {
  test('verifies missing users against the dummy-hash path and returns the same failure', async () => {
    const { crypto } = await fixture();
    expect(await identity.login('missing', 'bad')).toEqual({
      success: false,
      error: 'INCORRECT_CREDENTIALS',
    });
    expect(crypto.isPasswordValid).toHaveBeenCalledWith('bad', null);
    expect(await identity.login('admin', 'bad')).toEqual({
      success: false,
      error: 'INCORRECT_CREDENTIALS',
    });
  });

  test('returns public user data without authentication secrets', async () => {
    await fixture();
    const result = await identity.login('admin', 'old-password');
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected authenticated user');
    expect(result.user).toMatchObject({ id: 1, hasPassword: true });
    for (const secret of ['password', 'totpKey', 'oauthId'])
      expect(result.user).not.toHaveProperty(secret);
    expect(await identity.sessionUser(1)).toEqual(result.user);
  });

  test('enforces disabled password authentication for password and Basic login', async () => {
    const { crypto } = await fixture({ passwordEnabled: false });
    expect(() => identity.login('admin', 'old-password')).toThrow(
      'Password authentication is disabled'
    );
    await expect(
      identity.authenticateBasic('admin', 'old-password')
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(crypto.isPasswordValid).not.toHaveBeenCalled();
  });

  test('rejects disabled users for password, Basic, and session authentication', async () => {
    const { store } = await fixture();
    await store.users.update(1, { enabled: false });
    expect(await identity.login('admin', 'old-password')).toEqual({
      success: false,
      error: 'USER_DISABLED',
    });
    await expect(
      identity.authenticateBasic('admin', 'old-password')
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(identity.sessionUser(1)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('changes passwords only after verifying the current saved password', async () => {
    const { store } = await fixture();
    await expect(
      identity.updatePassword(actor, 'wrong', 'new-password')
    ).rejects.toThrow('Invalid password');
    expect((await store.users.get(1))?.password).toBe('hash:old-password');
    await identity.updatePassword(actor, 'old-password', 'new-password');
    expect((await identity.login('admin', 'new-password')).success).toBe(true);
    expect((await identity.login('admin', 'old-password')).success).toBe(false);
  });

  test('allows an OAuth-only account to establish its first password', async () => {
    const { store } = await fixture();
    await store.users.update(1, { password: null });
    await identity.updatePassword(actor, null, 'new-password');
    expect((await identity.login('admin', 'new-password')).success).toBe(true);
  });

  test('requires verified TOTP before completing a challenge and disallows Basic bypass', async () => {
    const { store } = await fixture();
    const setup = await identity.setupTotp(actor);
    expect(setup).toMatchObject({ type: 'setup', key: 'test-secret' });
    await expect(identity.verifyTotp(actor, '999999')).rejects.toThrow(
      'Invalid TOTP code'
    );
    expect((await store.users.get(1))?.totpVerified).toBe(false);
    await identity.verifyTotp(actor, '123456');
    const login = await identity.login('admin', 'old-password', true);
    expect(login).toMatchObject({
      success: false,
      error: 'TOTP_REQUIRED',
      pendingLogin: {
        type: 'password',
        userId: 1,
        remember: true,
        expires_at: 1_300_000,
      },
    });
    if (login.success || login.error !== 'TOTP_REQUIRED')
      throw new Error('Expected challenge');
    expect(
      await identity.completeSecondFactor(login.pendingLogin, '999999')
    ).toEqual({ status: 'INVALID_TOTP_CODE' });
    expect(
      await identity.completeSecondFactor(login.pendingLogin, '123456')
    ).toEqual({ status: 'success', userId: 1 });
    await expect(
      identity.authenticateBasic('admin', 'old-password')
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(identity.setupTotp(actor)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('expires pending challenges before validating any code', async () => {
    const { crypto } = await fixture();
    const pending = {
      type: 'password' as const,
      userId: 1,
      remember: false,
      expires_at: 999_999,
    };
    expect(identity.pending(pending)).toBeUndefined();
    expect(await identity.completeSecondFactor(pending, '123456')).toEqual({
      status: 'PENDING_LOGIN_EXPIRED',
    });
    expect(crypto.verifyTotpCode).not.toHaveBeenCalled();
  });

  test('rechecks user enablement when completing the second factor', async () => {
    const { store } = await fixture();
    await identity.setupTotp(actor);
    await identity.verifyTotp(actor, '123456');
    await store.users.update(1, { enabled: false });
    expect(
      await identity.completeSecondFactor(
        { type: 'oauth', userId: 1, remember: false, expires_at: 1_300_000 },
        '123456'
      )
    ).toEqual({ status: 'USER_DISABLED' });
  });

  test('does not remove TOTP on a failed password check', async () => {
    const { store } = await fixture();
    await identity.setupTotp(actor);
    await identity.verifyTotp(actor, '123456');
    await expect(identity.deleteTotp(actor, 'wrong')).rejects.toThrow(
      'Invalid password'
    );
    expect((await store.users.get(1))?.totpVerified).toBe(true);
    await identity.deleteTotp(actor, 'old-password');
    expect(await store.users.get(1)).toMatchObject({
      totpKey: null,
      totpVerified: false,
    });
  });

  test('links matching email accounts and returns their updated public identity', async () => {
    const { store } = await fixture();
    const result = await identity.loginWithOAuth(
      'oidc',
      'subject',
      'ignored',
      'admin@example.com',
      'Ignored'
    );
    expect(result).toMatchObject({
      success: true,
      user: { id: 1, oauthProvider: 'oidc' },
    });
    expect(await store.users.count()).toBe(1);
    expect(
      await identity.loginWithOAuth(
        'google',
        'other',
        'ignored',
        'admin@example.com',
        'Ignored'
      )
    ).toEqual({ success: false, error: 'USER_ALREADY_LINKED' });
  });

  test('requires TOTP for OAuth-linked accounts too', async () => {
    await fixture();
    await identity.setupTotp(actor);
    await identity.verifyTotp(actor, '123456');
    expect(
      await identity.loginWithOAuth(
        'oidc',
        'subject',
        'admin',
        'admin@example.com',
        'Admin'
      )
    ).toMatchObject({
      error: 'TOTP_REQUIRED',
      pendingLogin: { type: 'oauth', remember: false },
    });
  });

  test.each([false, true])(
    'honors OAuth auto-registration (%s)',
    async (oauthAutoRegister) => {
      const { store } = await fixture({ oauthAutoRegister });
      const result = await identity.loginWithOAuth(
        'oidc',
        'new',
        'new-user',
        'new@example.com',
        'New'
      );
      if (oauthAutoRegister) {
        expect(result).toMatchObject({
          success: true,
          user: { role: roles.ADMIN, hasPassword: false },
        });
        expect(await store.users.count()).toBe(2);
      } else {
        expect(result).toEqual({
          success: false,
          error: 'AUTO_REGISTER_DISABLED',
        });
        expect(await store.users.count()).toBe(1);
      }
    }
  );

  test('prevents unlinking the only login method and conflicting OAuth ownership', async () => {
    const { store } = await fixture();
    await identity.linkOauth(actor, 'oidc', 'subject');
    await store.users.update(1, { password: null });
    await expect(identity.unlinkOauth(actor)).rejects.toThrow(
      'Password login not enabled'
    );
    await store.users.insert({
      id: 2,
      username: 'other',
      name: 'Other',
      role: roles.CLIENT,
      enabled: true,
      totpVerified: false,
    });
    await expect(
      identity.linkOauth({ id: 2, role: roles.CLIENT }, 'oidc', 'subject')
    ).rejects.toThrow('OAuth account already linked with another user');
    expect(await store.users.get(2)).toMatchObject({
      oauthProvider: null,
      oauthId: null,
    });
  });
});
