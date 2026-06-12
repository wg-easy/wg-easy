import { createDebug } from 'obug';
import packageJson from '@@/package.json';

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
  /** List of enabled OAuth providers */
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
