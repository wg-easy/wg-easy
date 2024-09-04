import debug from 'debug';

export const WG_PATH = process.env.WG_PATH || '/etc/wireguard/';

export const SERVER_DEBUG = debug('Server');
