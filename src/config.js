'use strict';

const { release } = require('./package.json');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.WEBUI_HOST = process.env.WEBUI_HOST || '0.0.0.0';
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_DEVICE = process.env.WG_DEVICE || 'eth0';
module.exports.WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
module.exports.WG_HOST = process.env.WG_HOST;
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_MTU = process.env.WG_MTU || null;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 0;
module.exports.WG_DEFAULT_ADDRESS = process.env.WG_DEFAULT_ADDRESS || '10.8.0.x';
module.exports.WG_DEFAULT_ADDRESS6 = process.env.WG_DEFAULT_ADDRESS6 || 'fd42:42:42::x';
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '84.200.69.80';
module.exports.WG_DEFAULT_DNS6 = typeof process.env.WG_DEFAULT_DNS6 === 'string'
  ? process.env.WG_DEFAULT_DNS6
  : '2001:1608:10:25::1c04:b12f';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';

module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = process.env.WG_POST_UP || `
iptables -t nat -A POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${module.exports.WG_DEVICE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
iptables -A FORWARD -i ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -A FORWARD -o ${module.exports.WG_INTERFACE} -j ACCEPT;
ip6tables -t nat -A POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS6.replace('x', '0')}/64 -o ${module.exports.WG_DEVICE} -j MASQUERADE;
ip6tables -A INPUT -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
ip6tables -A FORWARD -i ${module.exports.WG_INTERFACE} -j ACCEPT;
ip6tables -A FORWARD -o ${module.exports.WG_INTERFACE} -j ACCEPT;
`.split('\n').join(' ');

module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || '';
