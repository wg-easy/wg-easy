import { createDebug } from 'obug';
import packageJson from '@@/package.json';

import { exec } from '#server/utils/cmd';
import { parseInterfaceName } from '#server/utils/interfaceName';
import { parseTrustedProxies } from '#server/utils/trustedProxy';
import type { OAuthProvider } from '#shared/contracts/identity';

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

export type OAuthConfig = {
  friendlyName: string;
  server: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  params: Record<string, string>;
  isOIDC?: false;
  userInfoFlow?: 'github';
};

type ConfiguredOAuthConfig = OAuthConfig & {
  clientId: string;
  clientSecret: string;
};

const GoogleConfig: OAuthConfig = {
  friendlyName: 'Google',
  server: 'https://accounts.google.com',
  scope: 'openid email profile',
  clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
  clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
  params: {
    access_type: 'online',
    prompt: 'select_account',
  },
};
const GithubConfig: OAuthConfig = {
  friendlyName: 'GitHub',
  server: 'https://github.com/login/oauth',
  scope: 'read:user user:email',
  clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
  clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
  params: {
    allow_signup: 'false',
    prompt: 'select_account',
  },
  isOIDC: false,
  userInfoFlow: 'github',
};
const OidcConfig: OAuthConfig = {
  friendlyName: process.env.OAUTH_OIDC_NAME ?? 'OIDC',
  server: process.env.OAUTH_OIDC_SERVER ?? '',
  scope: 'openid email profile',
  clientId: process.env.OAUTH_OIDC_CLIENT_ID,
  clientSecret: process.env.OAUTH_OIDC_CLIENT_SECRET,
  params: {},
};

export const OAUTH_PROVIDERS = {
  google: GoogleConfig,
  github: GithubConfig,
  oidc: OidcConfig,
} satisfies Record<OAuthProvider, OAuthConfig>;

export function isValidOauthProvider(
  provider: string
): provider is OAuthProvider {
  return Object.hasOwn(OAUTH_PROVIDERS, provider);
}

function isConfiguredOauthProvider(
  oauthProvider: OAuthConfig
): oauthProvider is ConfiguredOAuthConfig {
  if (!oauthProvider.clientId || !oauthProvider.clientSecret) {
    return false;
  }
  return true;
}

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
  /** Name of the WireGuard interface */
  WG_INTERFACE: parseInterfaceName(process.env.WG_INTERFACE),
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
  /** Proxies allowed to provide forwarded request information */
  TRUSTED_PROXIES: parseTrustedProxies(process.env.TRUSTED_PROXIES),
};

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
