'use strict';

const childProcess = require('child_process');
const { release } = require('../package.json');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || '51821';
module.exports.WEBUI_HOST = process.env.WEBUI_HOST || '0.0.0.0';
module.exports.PASSWORD = process.env.PASSWORD || '';
module.exports.PASSWORD_HASH = process.env.PASSWORD_HASH || '';
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_DEVICE = process.env.WG_DEVICE || 'ens3';
module.exports.WG_HOST = process.env.WG_HOST || 'oracle-daily.duckdns.org';
module.exports.WG_PORT = process.env.WG_PORT || '51820';
module.exports.WG_CONFIG_PORT = process.env.WG_CONFIG_PORT || process.env.WG_PORT || '51820';
module.exports.WG_MTU = process.env.WG_MTU || '1412';
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || '25';
module.exports.WG_DEFAULT_ADDRESS = process.env.WG_DEFAULT_ADDRESS || '10.8.0.x';
module.exports.WG_DEFAULT_ADDRESS6 = process.env.WG_DEFAULT_ADDRESS6 || 'fdcc:ad94:bacf:61a4::cafe:x';
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '1.1.1.1';
// module.exports.WG_DEFAULT_DNS6 = typeof process.env.WG_DEFAULT_DNS6 === 'string'
//   ? process.env.WG_DEFAULT_DNS6
//   : '2606:4700:4700::1111';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '10.250.0.0/22, 10.254.1.0/24, fdcc:ad94:bacf:61a4::cafe:0/64';

// Set WG_POST_UP to allow IPv6 NAT and forwarding only if the required kernel module is available
const modules = childProcess.execSync('lsmod', {
  shell: 'bash',
});
module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = path.resolve(__dirname, './wgsh/wg0-post-up.sh');
// module.exports.WG_POST_UP = process.env.WG_POST_UP;
// if (!process.env.WG_POST_UP) {
//   module.exports.WG_POST_UP = `iptables -t nat -I POSTROUTING 1 -s ${module.exports.WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${module.exports.WG_DEVICE} -j MASQUERADE;
//   iptables -I INPUT 1 -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
//   iptables -I FORWARD 1 -i wg0 -j ACCEPT;
//   iptables -I FORWARD 1 -o wg0 -j ACCEPT;
//   ip6tables -t nat -I POSTROUTING 1 -o ${module.exports.WG_DEVICE} -j MASQUERADE;
//   ip6tables -I INPUT 1 -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
//   ip6tables -I FORWARD 1 -i wg0 -j ACCEPT;
//   ip6tables -I FORWARD 1 -o wg0 -j ACCEPT;`.split('\n').join(' ');
// }

module.exports.WG_PRE_DOWN = path.resolve(__dirname, './wgsh/wg0-pre-down.sh');
module.exports.WG_POST_DOWN = process.env.WG_PRE_DOWN || '';

// module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
// module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || `
// iptables -t nat -D POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${module.exports.WG_DEVICE} -j MASQUERADE;
// iptables -D INPUT -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
// iptables -D FORWARD -i wg0 -j ACCEPT;
// iptables -D FORWARD -o wg0 -j ACCEPT;
// ip6tables -t nat -D POSTROUTING -o ${module.exports.WG_DEVICE} -j MASQUERADE;
// ip6tables -D INPUT -p udp -m udp --dport ${module.exports.WG_PORT} -j ACCEPT;
// ip6tables -D FORWARD -i wg0 -j ACCEPT;
// ip6tables -D FORWARD -o wg0 -j ACCEPT;`.split('\n').join(' ');
module.exports.LANG = process.env.LANG || 'en';
module.exports.UI_TRAFFIC_STATS = process.env.UI_TRAFFIC_STATS || 'false';
module.exports.UI_CHART_TYPE = process.env.UI_CHART_TYPE || 0;
