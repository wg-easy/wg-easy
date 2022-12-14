'use strict';

const { release } = require('./package.json');
const WG_DEFAULT_ADDRESS = String(process.env.WG_DEFAULT_ADDRESS || '10.8.0.x').replace('x', '0');
const WG_POST_UP = [
  `iptables -t nat -A POSTROUTING -s ${WG_DEFAULT_ADDRESS}/24 -o eth0 -j MASQUERADE;`,
  'iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT;',
  'iptables -A FORWARD -i wg0 -j ACCEPT;',
  'iptables -A FORWARD -o wg0 -j ACCEPT;',
].join(' ');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_HOST = process.env.WG_HOST;
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_MTU = process.env.WG_MTU || null;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 0;
module.exports.WG_DEFAULT_ADDRESS = WG_DEFAULT_ADDRESS;
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '1.1.1.1';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';
module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = process.env.WG_POST_UP || WG_POST_UP;
module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || '';