import { createDebug } from 'obug';
import packageJson from '@@/package.json';

export const RELEASE = 'v' + packageJson.version;

export const SERVER_DEBUG = createDebug('Server');

const DEFAULT_INTERFACE_NAME = 'wg0';
const DEFAULT_UI_PORT = '51821';
const DEFAULT_WG_PORT = 51820;
const DEFAULT_STATE_DIR = '/etc/wireguard';

const interfaceNamePattern = /^[A-Za-z0-9_.-]{1,15}$/;

function parseInterfaceName(env: string, fallback = DEFAULT_INTERFACE_NAME) {
  const value = process.env[env]?.trim() || fallback;

  if (!interfaceNamePattern.test(value)) {
    throw new Error(
      `${env} must be 1-15 characters and contain only letters, numbers, '.', '_', or '-'`
    );
  }

  return value;
}

function parsePortEnv(env: string, fallback: number) {
  const raw = process.env[env]?.trim();
  if (!raw) {
    return fallback;
  }

  const port = Number.parseInt(raw, 10);
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    `${port}` !== raw
  ) {
    throw new Error(`${env} must be a TCP/UDP port between 1 and 65535`);
  }

  return port;
}

function parseOptionalIntegerEnv(env: string, min: number, max: number) {
  const raw = process.env[env];
  if (raw === undefined) {
    return undefined;
  }

  const value = raw.trim();
  const integer = Number.parseInt(value, 10);
  if (
    !Number.isInteger(integer) ||
    integer < min ||
    integer > max ||
    `${integer}` !== value
  ) {
    throw new Error(`${env} must be an integer between ${min} and ${max}`);
  }

  return integer;
}

function parseOptionalBooleanEnv(env: string) {
  const raw = process.env[env];
  if (raw === undefined) {
    return undefined;
  }

  const value = raw.trim();
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  throw new Error(`${env} must be either true or false`);
}

function parseStateDir() {
  const value = process.env.WG_STATE_DIR?.trim() || DEFAULT_STATE_DIR;
  if (!value.startsWith('/') || value.includes('\0')) {
    throw new Error('WG_STATE_DIR must be an absolute path');
  }

  return value.replace(/\/+$/, '') || '/';
}

function parseOptionalListEnv(env: string) {
  const raw = process.env[env];
  if (raw === undefined) {
    return undefined;
  }

  if (raw.trim() === '') {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

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
  PORT: process.env.PORT?.trim() || DEFAULT_UI_PORT,
  /** If IPv6 should be disabled */
  DISABLE_IPV6: process.env.DISABLE_IPV6 === 'true',
  /** WireGuard interface name */
  INTERFACE_NAME: parseInterfaceName('WG_INTERFACE_NAME'),
  /** WireGuard listen port */
  WG_PORT: parsePortEnv('WG_PORT', DEFAULT_WG_PORT),
  /** Optional external network device for NAT hooks */
  WG_DEVICE: process.env.WG_DEVICE
    ? parseInterfaceName('WG_DEVICE', process.env.WG_DEVICE)
    : null,
  /** Optional Nix-managed per-client firewall setting */
  FIREWALL_ENABLED: parseOptionalBooleanEnv('WG_FIREWALL_ENABLED'),
  /** Writable directory for database and WireGuard configs */
  STATE_DIR: parseStateDir(),
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

export const WG_CLIENT_DEFAULTS = {
  DNS: parseOptionalListEnv('WG_DEFAULT_DNS'),
  ALLOWED_IPS: parseOptionalListEnv('WG_DEFAULT_ALLOWED_IPS'),
  SERVER_ALLOWED_IPS: parseOptionalListEnv('WG_DEFAULT_SERVER_ALLOWED_IPS'),
  FIREWALL_ALLOWED_IPS: parseOptionalListEnv('WG_DEFAULT_FIREWALL_ALLOWED_IPS'),
  PERSISTENT_KEEPALIVE: parseOptionalIntegerEnv(
    'WG_DEFAULT_PERSISTENT_KEEPALIVE',
    0,
    65535
  ),
  FORCE_UPDATE_CLIENTS: process.env.WG_FORCE_UPDATE_CLIENTS === 'true',
};
