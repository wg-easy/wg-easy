import { timingSafeEqual } from 'node:crypto';

import { defineEventHandler, getHeader, getRequestIP, getRequestURL } from 'h3';

import Database from '#server/utils/Database';
import { SERVER_DEBUG, WG_ENV } from '#server/utils/config';
import { getWGSession, useWGSession } from '#server/utils/session';
import { roles } from '#shared/utils/permissions';

/*
 * Trusted-header SSO (Culpur Defense fork).
 *
 * Runs before route handlers. When TRUSTED_PROXY_ENABLED is set and the request
 * proves it came from the trusted proxy, this reads the identity header that a
 * trusted upstream (an Authentik forward-auth outpost) has asserted, resolves or
 * auto-provisions the matching wg-easy user via the same OAuth account machinery
 * upstream uses (Database.users.loginWithTrustedHeader, oauth_provider =
 * 'trusted-header'), and establishes the normal wg-easy session — exactly the
 * way the OAuth callback does (session.update({ userId })). Everything downstream
 * (getCurrentUser -> definePermissionEventHandler -> RBAC) then works unchanged.
 *
 * SECURITY MODEL — why this is not an auth bypass:
 *   1. Off by default. Stock wg-easy never runs this branch.
 *   2. Shared secret (PRIMARY). The proxy injects TRUSTED_PROXY_SECRET_HEADER with
 *      a secret only it knows; wg-easy verifies it with a constant-time compare. A
 *      direct-to-port attacker on the LAN cannot forge it. THIS is the real trust
 *      boundary in a shared-bridge topology, where Docker SNATs every inbound
 *      connection to the bridge gateway so the source IP alone can't tell the
 *      proxy apart from any other host that can reach the published port.
 *   3. Source-IP allowlist (OPTIONAL defense-in-depth). If TRUSTED_PROXY_IPS is
 *      set, the real socket peer must also match. Read via getRequestIP(event,
 *      { xForwardedFor: false }) — the connection remoteAddress, NOT the spoofable
 *      X-Forwarded-For. Left empty when SNAT makes the peer non-discriminating.
 *
 * In our topology the outpost also strips any client-supplied identity headers
 * and sets its own, so the identity header cannot arrive pre-set from a browser.
 *
 * If the feature is disabled, the secret is missing/wrong, the (optional) IP check
 * fails, or no identity header is present, this middleware does nothing and the
 * request falls through to the existing password/session auth untouched.
 */

/** Constant-time string compare that never throws on length/'' mismatch. */
function secretMatches(
  provided: string | undefined,
  expected: string
): boolean {
  if (!provided) {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export default defineEventHandler(async (event) => {
  if (!WG_ENV.TRUSTED_PROXY_ENABLED) {
    return;
  }

  // Fail closed: enabling the feature without a secret must NOT trust anything.
  if (!WG_ENV.TRUSTED_PROXY_SECRET) {
    return;
  }

  // Only act on API calls and page loads; leave setup/i18n alone (mirrors setup.ts).
  const url = getRequestURL(event);
  if (
    url.pathname.startsWith('/_i18n/') ||
    url.pathname.startsWith('/setup/')
  ) {
    return;
  }

  // 1a. Trust gate — the proxy-injected shared secret must match (constant time).
  const providedSecret = getHeader(event, WG_ENV.TRUSTED_PROXY_SECRET_HEADER);
  if (!secretMatches(providedSecret, WG_ENV.TRUSTED_PROXY_SECRET)) {
    SERVER_DEBUG(
      `Trusted-header SSO: secret check failed for ${url.pathname} ` +
        `(header '${WG_ENV.TRUSTED_PROXY_SECRET_HEADER}' present=${!!providedSecret})`
    );
    return;
  }

  // 1b. Optional defense-in-depth — if an IP allowlist is configured, the real
  //     socket peer must also be in it. Skipped when the list is empty (SNAT case).
  if (WG_ENV.TRUSTED_PROXY_IPS.length > 0) {
    const peer = getRequestIP(event, { xForwardedFor: false });
    if (!peer || !WG_ENV.TRUSTED_PROXY_IPS.includes(peer)) {
      SERVER_DEBUG(`Trusted-header SSO: peer ${peer} not in allowlist`);
      return;
    }
  }

  // 2. Read the identity the upstream verified.
  const username = getHeader(event, WG_ENV.TRUSTED_PROXY_HEADER)?.trim();
  if (!username) {
    SERVER_DEBUG(
      `Trusted-header SSO: secret OK but no username header ` +
        `('${WG_ENV.TRUSTED_PROXY_HEADER}') on ${url.pathname}`
    );
    return;
  }

  // If a valid session already exists for this same user, don't re-mint it.
  const existingSession = await getWGSession(event);
  if (existingSession.data.userId) {
    const current = await Database.users.get(existingSession.data.userId);
    if (current && current.username === username) {
      return;
    }
  }

  // 3. Resolve or provision the federated user via the shared OAuth machinery,
  //    then establish the session the same way the OAuth callback does.
  const email = getHeader(event, WG_ENV.TRUSTED_PROXY_EMAIL_HEADER)?.trim();
  const name = getHeader(event, WG_ENV.TRUSTED_PROXY_NAME_HEADER)?.trim();

  const result = await Database.users.loginWithTrustedHeader(
    username,
    username,
    email || null,
    name || username,
    WG_ENV.TRUSTED_PROXY_DEFAULT_ROLE === 'admin' ? roles.ADMIN : roles.CLIENT
  );

  if (!result.success) {
    // A blocked identity (disabled / already linked to another provider / TOTP
    // required / auto-register disabled) must NOT establish a session. Fall
    // through to the normal auth flow, which surfaces the appropriate error.
    SERVER_DEBUG(
      `Trusted-header SSO: login for '${username}' not established (${result.error})`
    );
    return;
  }

  const session = await useWGSession(event);
  const data = await session.update({ userId: result.user.id });

  SERVER_DEBUG(
    `Trusted-header SSO: session ${data.id} established for ${result.user.id} (${result.user.username})`
  );
});
