import type { SessionConfig } from 'h3';

import packageJSON from '../../package.json';
import debug from 'debug';
const version = packageJSON.release.version;

export const RELEASE = version;
export const PORT = process.env.PORT || '51821';
export const WEBUI_HOST = process.env.WEBUI_HOST || '0.0.0.0';
export const PASSWORD_HASH = process.env.PASSWORD_HASH;
export const WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
export const WG_DEVICE = process.env.WG_DEVICE || 'eth0';
export const WG_HOST = process.env.WG_HOST;
export const WG_PORT = process.env.WG_PORT || '51820';
export const WG_CONFIG_PORT =
  process.env.WG_CONFIG_PORT || process.env.WG_PORT || '51820';
export const WG_MTU = process.env.WG_MTU || null;
export const WG_PERSISTENT_KEEPALIVE =
  process.env.WG_PERSISTENT_KEEPALIVE || '0';
export const WG_DEFAULT_ADDRESS = process.env.WG_DEFAULT_ADDRESS || '10.8.0.x';
export const WG_DEFAULT_DNS =
  typeof process.env.WG_DEFAULT_DNS === 'string'
    ? process.env.WG_DEFAULT_DNS
    : '1.1.1.1';
export const WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';

export const WG_PRE_UP = process.env.WG_PRE_UP || '';
export const WG_POST_UP =
  process.env.WG_POST_UP ||
  `
iptables -t nat -A POSTROUTING -s ${WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${WG_DEVICE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${WG_PORT} -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');

export const WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
export const WG_POST_DOWN =
  process.env.WG_POST_DOWN ||
  `
iptables -t nat -D POSTROUTING -s ${WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${WG_DEVICE} -j MASQUERADE;
iptables -D INPUT -p udp -m udp --dport ${WG_PORT} -j ACCEPT;
iptables -D FORWARD -i wg0 -j ACCEPT;
iptables -D FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');
export const LANG = process.env.LANG || 'en';
export const UI_TRAFFIC_STATS = process.env.UI_TRAFFIC_STATS || 'false';
export const UI_CHART_TYPE = process.env.UI_CHART_TYPE || '0';

export const REQUIRES_PASSWORD = !!PASSWORD_HASH;

export const SESSION_CONFIG = {
  password: getRandomHex(256),
  name: 'wg-easy'
} satisfies SessionConfig;

export const SERVER_DEBUG = debug('Server');
