import { createError } from 'nuxt/server';

import { WG_ENV } from '#server/utils/config';
import { hashPassword, isPasswordValid } from '#server/utils/password';
import { createTotp, verifyTotpCode } from '#server/utils/totp';
import { getDatabase } from '#db';
import type { UserType } from '#db/repositories/user/types';
import type {
  Actor,
  OAuthProvider,
  PendingLogin,
  PublicUser,
} from '#shared/contracts/identity';
import { roles } from '#shared/utils/permissions';
import { authorize } from '#server/features/authorization';

function publicUser(user: UserType): PublicUser {
  return {
    id: user.id,
    role: user.role,
    username: user.username,
    name: user.name,
    email: user.email,
    totpVerified: user.totpVerified,
    oauthProvider: user.oauthProvider,
    hasPassword: user.password !== null,
  };
}

type Authenticated = { success: true; user: PublicUser };
type Challenge = {
  success: false;
  error: 'TOTP_REQUIRED';
  pendingLogin: PendingLogin;
};
type PasswordLoginResult =
  | Authenticated
  | Challenge
  | {
      success: false;
      error: 'INCORRECT_CREDENTIALS' | 'USER_DISABLED';
    };
type OAuthLoginResult =
  | Authenticated
  | Challenge
  | {
      success: false;
      error:
        | 'USER_DISABLED'
        | 'USER_ALREADY_LINKED'
        | 'AUTO_REGISTER_DISABLED'
        | 'UNEXPECTED_ERROR';
    };

export function assertPasswordEnabled() {
  if (WG_ENV.DISABLE_PASSWORD_AUTH)
    throw createError({
      status: 403,
      statusText: 'Password authentication is disabled',
    });
}

function authenticated(
  user: UserType,
  type: PendingLogin['type'],
  remember: boolean
): Authenticated | Challenge {
  if (user.totpVerified)
    return {
      success: false,
      error: 'TOTP_REQUIRED',
      pendingLogin: {
        type,
        userId: user.id,
        remember,
        expires_at: Date.now() + 5 * 60 * 1000,
      },
    };
  return { success: true, user: publicUser(user) };
}

export function pending(login: PendingLogin | undefined) {
  return login && Date.now() <= login.expires_at ? login : undefined;
}

async function requireUser(id: number, users = getDatabase().users) {
  const user = await users.get(id);
  if (!user) throw new Error('User not found');
  return user;
}

export async function sessionUser(id: number) {
  const user = await getDatabase().users.get(id);
  if (user && !user.enabled)
    throw createError({ status: 403, statusText: 'User is disabled' });
  return user ? publicUser(user) : undefined;
}

export async function authenticateBasic(username: string, password: string) {
  assertPasswordEnabled();
  const user = await getDatabase().users.getByUsername(username);
  // Verify missing users against the dummy hash as well.
  const valid = await isPasswordValid(password, user?.password ?? null);
  if (!user || !valid || user.totpVerified)
    throw createError({ status: 401, statusText: 'Session failed' });
  if (!user.enabled)
    throw createError({ status: 403, statusText: 'User is disabled' });
  return publicUser(user);
}

export function login(
  username: string,
  password: string,
  remember = false
): Promise<PasswordLoginResult> {
  assertPasswordEnabled();
  return getDatabase().transaction(async ({ users }) => {
    const user = await users.getByUsername(username);
    const valid = await isPasswordValid(password, user?.password ?? null);
    if (!user || !valid)
      return { success: false, error: 'INCORRECT_CREDENTIALS' };
    if (!user.enabled) return { success: false, error: 'USER_DISABLED' };
    return authenticated(user, 'password', remember);
  });
}

export function loginWithOAuth(
  provider: OAuthProvider,
  oauthId: string,
  username: string,
  email: string,
  name: string
): Promise<OAuthLoginResult> {
  return getDatabase().transaction(async ({ users }) => {
    const linked = await users.getByOAuth(provider, oauthId);
    if (linked) {
      if (!linked.enabled) return { success: false, error: 'USER_DISABLED' };
      return authenticated(linked, 'oauth', false);
    }
    const existing = await users.getByEmail(email);
    if (existing) {
      if (!existing.enabled) return { success: false, error: 'USER_DISABLED' };
      if (existing.oauthProvider && existing.oauthId)
        return { success: false, error: 'USER_ALREADY_LINKED' };
      await users.update(existing.id, { oauthProvider: provider, oauthId });
      return authenticated(
        { ...existing, oauthProvider: provider, oauthId },
        'oauth',
        false
      );
    }
    if (!WG_ENV.OAUTH_AUTO_REGISTER)
      return { success: false, error: 'AUTO_REGISTER_DISABLED' };
    const [created] = await users.insert({
      username,
      password: null,
      email,
      name,
      role: roles.ADMIN,
      totpVerified: false,
      enabled: true,
      oauthProvider: provider,
      oauthId,
    });
    if (!created) return { success: false, error: 'UNEXPECTED_ERROR' };
    return { success: true, user: publicUser(created) };
  });
}

export async function completeSecondFactor(
  login: PendingLogin | undefined,
  code: string
) {
  if (!login)
    throw createError({
      status: 401,
      statusText: 'No pending authentication',
    });
  if (!pending(login)) return { status: 'PENDING_LOGIN_EXPIRED' as const };
  return getDatabase().transaction(async ({ users }) => {
    const user = await users.get(login.userId);
    if (
      !user ||
      !user.totpVerified ||
      !user.totpKey ||
      !verifyTotpCode(user.username, user.totpKey, code)
    ) {
      return { status: 'INVALID_TOTP_CODE' as const };
    }
    if (!user.enabled) return { status: 'USER_DISABLED' as const };
    return { status: 'success' as const, userId: user.id };
  });
}

export async function updateProfile(
  actor: Actor,
  name: string,
  email: string | null
) {
  authorize(actor, 'me', 'update', actor);
  await getDatabase().users.update(actor.id, { name, email });
}

export async function updatePassword(
  actor: Actor,
  currentPassword: string | null,
  newPassword: string
) {
  authorize(actor, 'me', 'update', actor);
  const hash = await hashPassword(newPassword);
  await getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (
      user.password !== null &&
      (!currentPassword ||
        !(await isPasswordValid(currentPassword, user.password)))
    ) {
      throw new Error('Invalid password');
    }
    await users.update(actor.id, { password: hash });
  });
}

export function setupTotp(actor: Actor) {
  authorize(actor, 'me', 'update', actor);
  return getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (user.totpVerified)
      throw createError({
        status: 409,
        statusText: 'TOTP is already enabled',
      });
    const setup = createTotp(user.username);
    await users.update(user.id, {
      totpKey: setup.key,
      totpVerified: false,
    });
    return { success: true, type: 'setup' as const, ...setup };
  });
}

export function verifyTotp(actor: Actor, code: string) {
  authorize(actor, 'me', 'update', actor);
  return getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (user.totpVerified) throw new Error('TOTP is already verified');
    if (!user.totpKey) throw new Error('TOTP key is not set');
    if (!verifyTotpCode(user.username, user.totpKey, code))
      throw new Error('Invalid TOTP code');
    await users.update(user.id, { totpVerified: true });
    return { success: true, type: 'created' as const };
  });
}

export function deleteTotp(actor: Actor, currentPassword: string) {
  authorize(actor, 'me', 'update', actor);
  return getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (!user.totpVerified)
      throw createError({
        status: 409,
        statusText: 'TOTP is not enabled',
      });
    if (!(await isPasswordValid(currentPassword, user.password)))
      throw new Error('Invalid password');
    await users.update(user.id, { totpKey: null, totpVerified: false });
    return { success: true, type: 'deleted' as const };
  });
}

export function unlinkOauth(actor: Actor) {
  authorize(actor, 'me', 'update', actor);
  return getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (!user.password) throw new Error('Password login not enabled');
    await users.update(user.id, { oauthProvider: null, oauthId: null });
  });
}

export function linkOauth(
  actor: Actor,
  provider: OAuthProvider,
  oauthId: string
) {
  authorize(actor, 'me', 'update', actor);
  return getDatabase().transaction(async ({ users }) => {
    const user = await requireUser(actor.id, users);
    if (user.oauthProvider || user.oauthId)
      throw new Error('User already linked with an OAuth provider');
    if (await users.getByOAuth(provider, oauthId))
      throw new Error('OAuth account already linked with another user');
    await users.update(user.id, { oauthProvider: provider, oauthId });
  });
}
