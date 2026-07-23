import { createDebug } from 'obug';
import packageJson from '@@/package.json';

import { exec } from '#server/utils/cmd';
import {
  OAUTH_PROVIDERS,
  isConfiguredOauthProvider,
  isValidOauthProvider,
} from '#server/utils/oauth';

export const RELEASE = 'v' + packageJson.version;

export const SERVER_DEBUG = createDebug('Server');

export const OLD_ENV = {
  /** @deprecated Only for migration purposes */
  PASSWORD: process.env.PASSWORD,
  /** @deprecated Only for migration purposes */
  PASSWORD_HASH: process.env.PASSWORD_HASH,
};

const detectAwg = async (): Promise<'awg' | 'wg'> => {
  /** TODO: delete on next major version */
  if (process.env.EXPERIMENTAL_AWG === 'true') {
    const OVERRIDE_AUTO_AWG = process.env.OVERRIDE_AUTO_AWG?.toLowerCase();

    if (
      OVERRIDE_AUTO_AWG === ('wg' as const) ||
      OVERRIDE_AUTO_AWG === ('awg' as const)
    ) {
      return OVERRIDE_AUTO_AWG;
    } else {
      return await exec('modinfo amneziawg')
        .then(() => 'awg' as const)
        .catch(() => 'wg' as const);
    }
  } else return 'wg';
};

const oauthProviders = process.env.OAUTH_PROVIDERS?.split(',')
  .map((v) => v.trim())
  .filter((v) => isValidOauthProvider(v))
  .filter((v) => isConfiguredOauthProvider(OAUTH_PROVIDERS[v]));

export const WG_ENV = {
  /** UI is hosted on HTTP instead of HTTPS */
  INSECURE: process.env.INSECURE === 'true',
  /** Port the UI is listening on */
  PORT: assertEnv('PORT'),
  /** If IPv6 should be disabled */
  DISABLE_IPV6: process.env.DISABLE_IPV6 === 'true',
  WG_EXECUTABLE: await detectAwg(),
  DISABLE_VERSION_CHECK: process.env.DISABLE_VERSION_CHECK === 'true',
  /** List of enabled and configured OAuth providers */
  OAUTH_PROVIDERS: oauthProviders,
  /** List of allowed OAuth domains */
  OAUTH_ALLOWED_DOMAINS: process.env.OAUTH_ALLOWED_DOMAINS?.split(',').map(
    (v) => v.trim()
  ),
  /** Automatically register users that log in with an OAuth provider */
  OAUTH_AUTO_REGISTER: process.env.OAUTH_AUTO_REGISTER === 'true',
  /** Which OAuth provider to automatically launch */
  OAUTH_AUTO_LAUNCH:
    oauthProviders?.find((p) => p === process.env.OAUTH_AUTO_LAUNCH) ?? null,
  /** Disable password authentication */
  DISABLE_PASSWORD_AUTH: process.env.DISABLE_PASSWORD_AUTH === 'true',
  /**
   * Trusted-header SSO (Culpur fork).
   *
   * When enabled, an already-authenticated upstream reverse proxy (e.g. an
   * Authentik forward-auth outpost) may assert the caller's identity via a
   * header. wg-easy then establishes a session for the matching user, reusing
   * the OAuth account machinery (oauth_provider = 'trusted-header') and the
   * OAUTH_AUTO_REGISTER gate to auto-provision when absent. DISABLED by default:
   * stock behaviour is unchanged unless TRUSTED_PROXY_ENABLED is set.
   */
  TRUSTED_PROXY_ENABLED: process.env.TRUSTED_PROXY_ENABLED === 'true',
  /**
   * Shared secret the trusted proxy injects (PRIMARY trust factor). The feature
   * fails closed if this is unset while enabled. In a shared-bridge / Docker
   * SNAT topology this — not the source IP — is what proves a request came from
   * the proxy, because every inbound connection is SNAT'd to the bridge gateway.
   */
  TRUSTED_PROXY_SECRET: process.env.TRUSTED_PROXY_SECRET ?? '',
  /** Header the proxy uses to carry the shared secret. */
  TRUSTED_PROXY_SECRET_HEADER: (
    process.env.TRUSTED_PROXY_SECRET_HEADER ?? 'x-wg-proxy-secret'
  ).toLowerCase(),
  /** Header carrying the verified username, e.g. 'x-authentik-username'. */
  TRUSTED_PROXY_HEADER: (
    process.env.TRUSTED_PROXY_HEADER ?? 'x-authentik-username'
  ).toLowerCase(),
  /** Optional header carrying the verified email. */
  TRUSTED_PROXY_EMAIL_HEADER: (
    process.env.TRUSTED_PROXY_EMAIL_HEADER ?? 'x-authentik-email'
  ).toLowerCase(),
  /** Optional header carrying the display name. */
  TRUSTED_PROXY_NAME_HEADER: (
    process.env.TRUSTED_PROXY_NAME_HEADER ?? 'x-authentik-name'
  ).toLowerCase(),
  /**
   * Optional comma-separated allowlist of proxy source IPs permitted to assert
   * identity (defense-in-depth). Left empty when SNAT makes the peer IP
   * non-discriminating; the shared secret remains the trust boundary.
   */
  TRUSTED_PROXY_IPS: (process.env.TRUSTED_PROXY_IPS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0),
  /** Role for auto-provisioned federated users: 'admin' or 'client' (default). */
  TRUSTED_PROXY_DEFAULT_ROLE:
    process.env.TRUSTED_PROXY_DEFAULT_ROLE === 'admin' ? 'admin' : 'client',
};

if (WG_ENV.TRUSTED_PROXY_ENABLED) {
  SERVER_DEBUG(`
Trusted-header SSO: Enabled${WG_ENV.TRUSTED_PROXY_SECRET ? '' : ' (NO SECRET — fails closed)'}
Username header: ${WG_ENV.TRUSTED_PROXY_HEADER}
Secret header: ${WG_ENV.TRUSTED_PROXY_SECRET_HEADER}
Source IP allowlist: ${WG_ENV.TRUSTED_PROXY_IPS.length > 0 ? WG_ENV.TRUSTED_PROXY_IPS.join(', ') : 'None (secret-only)'}
Auto register: ${WG_ENV.OAUTH_AUTO_REGISTER ? 'Enabled' : 'Disabled'}
Default role: ${WG_ENV.TRUSTED_PROXY_DEFAULT_ROLE}
`);
}

if (WG_ENV.OAUTH_PROVIDERS && WG_ENV.OAUTH_PROVIDERS.length > 0) {
  SERVER_DEBUG(`
Enabled OAuth providers: ${WG_ENV.OAUTH_PROVIDERS.join(', ')}
Allowed OAuth domains: ${WG_ENV.OAUTH_ALLOWED_DOMAINS?.join(', ') ?? 'All'}
OAuth auto register: ${WG_ENV.OAUTH_AUTO_REGISTER ? 'Enabled' : 'Disabled'}
Password authentication: ${WG_ENV.DISABLE_PASSWORD_AUTH ? 'Disabled' : 'Enabled'}
Auto launch OAuth provider: ${WG_ENV.OAUTH_AUTO_LAUNCH ?? 'None'}
`);
}

export const WG_INITIAL_ENV = {
  ENABLED: process.env.INIT_ENABLED === 'true',
  USERNAME: process.env.INIT_USERNAME,
  PASSWORD: process.env.INIT_PASSWORD,
  DNS: process.env.INIT_DNS?.split(',').map((x) => x.trim()),
  IPV4_CIDR: process.env.INIT_IPV4_CIDR,
  IPV6_CIDR: process.env.INIT_IPV6_CIDR,
  ALLOWED_IPS: process.env.INIT_ALLOWED_IPS?.split(',').map((x) => x.trim()),
  HOST: process.env.INIT_HOST,
  PORT: process.env.INIT_PORT
    ? Number.parseInt(process.env.INIT_PORT, 10)
    : undefined,
};

function assertEnv<T extends string>(env: T) {
  const val = process.env[env];

  if (!val) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return val;
}
