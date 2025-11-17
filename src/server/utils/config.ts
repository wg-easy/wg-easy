import debug from 'debug';
import packageJson from '@@/package.json';

export const RELEASE = 'v' + packageJson.version;

export const SERVER_DEBUG = debug('Server');

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

export const WG_ENV = {
  /** UI is hosted on HTTP instead of HTTPS */
  INSECURE: process.env.INSECURE === 'true',
  /** Port the UI is listening on */
  PORT: assertEnv('PORT'),
  /** If IPv6 should be disabled */
  DISABLE_IPV6: process.env.DISABLE_IPV6 === 'true',
  WG_EXECUTABLE: await detectAwg(),
};

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

export const WG_OVERRIDE_ENV = {
  /** Override the WireGuard interface port */
  PORT: process.env.WG_PORT
    ? Number.parseInt(process.env.WG_PORT, 10)
    : undefined,
  /** Override the network device/interface */
  DEVICE: process.env.WG_DEVICE,
  /** Override the MTU setting */
  MTU: process.env.WG_MTU ? Number.parseInt(process.env.WG_MTU, 10) : undefined,
  /** Override the IPv4 CIDR */
  IPV4_CIDR: process.env.WG_IPV4_CIDR,
  /** Override the IPv6 CIDR */
  IPV6_CIDR: process.env.WG_IPV6_CIDR,
};

export const WG_CLIENT_OVERRIDE_ENV = {
  /** Override the client connection host */
  HOST: process.env.WG_HOST,
  /** Override the client connection port (different from WG_PORT which is the interface port) */
  CLIENT_PORT: process.env.WG_CLIENT_PORT
    ? Number.parseInt(process.env.WG_CLIENT_PORT, 10)
    : undefined,
  /** Override default client DNS servers */
  DEFAULT_DNS: process.env.WG_DEFAULT_DNS?.split(',').map((x) => x.trim()),
  /** Override default client allowed IPs */
  DEFAULT_ALLOWED_IPS: process.env.WG_DEFAULT_ALLOWED_IPS?.split(',').map((x) =>
    x.trim()
  ),
  /** Override default client MTU */
  DEFAULT_MTU: process.env.WG_DEFAULT_MTU
    ? Number.parseInt(process.env.WG_DEFAULT_MTU, 10)
    : undefined,
  /** Override default client persistent keepalive */
  DEFAULT_PERSISTENT_KEEPALIVE: process.env.WG_DEFAULT_PERSISTENT_KEEPALIVE
    ? Number.parseInt(process.env.WG_DEFAULT_PERSISTENT_KEEPALIVE, 10)
    : undefined,
};

export const WG_GENERAL_OVERRIDE_ENV = {
  /** Override session timeout */
  SESSION_TIMEOUT: process.env.WG_SESSION_TIMEOUT
    ? Number.parseInt(process.env.WG_SESSION_TIMEOUT, 10)
    : undefined,
  /** Override metrics password */
  METRICS_PASSWORD: process.env.WG_METRICS_PASSWORD,
  /** Override metrics Prometheus enabled status */
  METRICS_PROMETHEUS:
    process.env.WG_METRICS_PROMETHEUS === 'true'
      ? true
      : process.env.WG_METRICS_PROMETHEUS === 'false'
        ? false
        : undefined,
  /** Override metrics JSON enabled status */
  METRICS_JSON:
    process.env.WG_METRICS_JSON === 'true'
      ? true
      : process.env.WG_METRICS_JSON === 'false'
        ? false
        : undefined,
};

export const WG_HOOKS_OVERRIDE_ENV = {
  /** Override PreUp hook */
  PRE_UP: process.env.WG_PRE_UP,
  /** Override PostUp hook */
  POST_UP: process.env.WG_POST_UP,
  /** Override PreDown hook */
  PRE_DOWN: process.env.WG_PRE_DOWN,
  /** Override PostDown hook */
  POST_DOWN: process.env.WG_POST_DOWN,
};

function assertEnv<T extends string>(env: T) {
  const val = process.env[env];

  if (!val) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return val;
}

/**
 * Apply environment variable overrides to an interface object
 */
export function applyInterfaceOverrides<
  T extends {
    port: number;
    device: string;
    mtu: number;
    ipv4Cidr: string;
    ipv6Cidr: string;
  },
>(wgInterface: T): T {
  return {
    ...wgInterface,
    port: WG_OVERRIDE_ENV.PORT ?? wgInterface.port,
    device: WG_OVERRIDE_ENV.DEVICE ?? wgInterface.device,
    mtu: WG_OVERRIDE_ENV.MTU ?? wgInterface.mtu,
    ipv4Cidr: WG_OVERRIDE_ENV.IPV4_CIDR ?? wgInterface.ipv4Cidr,
    ipv6Cidr: WG_OVERRIDE_ENV.IPV6_CIDR ?? wgInterface.ipv6Cidr,
  };
}

/**
 * Apply environment variable overrides to a user config object
 */
export function applyUserConfigOverrides<
  T extends {
    host: string;
    port: number;
    defaultDns: string[];
    defaultAllowedIps: string[];
    defaultMtu: number;
    defaultPersistentKeepalive: number;
  },
>(userConfig: T): T {
  return {
    ...userConfig,
    host: WG_CLIENT_OVERRIDE_ENV.HOST ?? userConfig.host,
    port: WG_CLIENT_OVERRIDE_ENV.CLIENT_PORT ?? userConfig.port,
    defaultDns: WG_CLIENT_OVERRIDE_ENV.DEFAULT_DNS ?? userConfig.defaultDns,
    defaultAllowedIps:
      WG_CLIENT_OVERRIDE_ENV.DEFAULT_ALLOWED_IPS ??
      userConfig.defaultAllowedIps,
    defaultMtu: WG_CLIENT_OVERRIDE_ENV.DEFAULT_MTU ?? userConfig.defaultMtu,
    defaultPersistentKeepalive:
      WG_CLIENT_OVERRIDE_ENV.DEFAULT_PERSISTENT_KEEPALIVE ??
      userConfig.defaultPersistentKeepalive,
  };
}

/**
 * Apply environment variable overrides to a general config object
 */
export function applySessionOverrides<
  T extends {
    sessionTimeout: number;
  },
>(generalConfig: T): T {
  return {
    ...generalConfig,
    sessionTimeout:
      WG_GENERAL_OVERRIDE_ENV.SESSION_TIMEOUT ?? generalConfig.sessionTimeout,
  };
}

export function applyMetricsOverrides<
  T extends {
    password: string | null;
    prometheus: boolean;
    json: boolean;
  },
>(metricsConfig: T): T {
  return {
    ...metricsConfig,
    password:
      WG_GENERAL_OVERRIDE_ENV.METRICS_PASSWORD ?? metricsConfig.password,
    prometheus:
      WG_GENERAL_OVERRIDE_ENV.METRICS_PROMETHEUS ?? metricsConfig.prometheus,
    json: WG_GENERAL_OVERRIDE_ENV.METRICS_JSON ?? metricsConfig.json,
  };
}

/**
 * Apply environment variable overrides to a hooks object
 */
export function applyHooksOverrides<
  T extends {
    preUp: string;
    postUp: string;
    preDown: string;
    postDown: string;
  },
>(hooks: T): T {
  return {
    ...hooks,
    preUp: WG_HOOKS_OVERRIDE_ENV.PRE_UP ?? hooks.preUp,
    postUp: WG_HOOKS_OVERRIDE_ENV.POST_UP ?? hooks.postUp,
    preDown: WG_HOOKS_OVERRIDE_ENV.PRE_DOWN ?? hooks.preDown,
    postDown: WG_HOOKS_OVERRIDE_ENV.POST_DOWN ?? hooks.postDown,
  };
}
