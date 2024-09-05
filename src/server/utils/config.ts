import debug from 'debug';
import packageJson from '@@/package.json';

export const WG_PATH = process.env.WG_PATH || '/etc/wireguard/';

export const RELEASE = packageJson.release.version;

export const SERVER_DEBUG = debug('Server');
