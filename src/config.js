'use strict';

const { release } = require('./package.json');
const childProcess = require('child_process');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_HOST = process.env.WG_HOST;
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_MTU = process.env.WG_MTU || null;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 0;
module.exports.WG_DEFAULT_ADDRESS = process.env.WG_DEFAULT_ADDRESS || '10.8.0.x';
module.exports.WG_DEFAULT_ADDRESS6 = process.env.WG_DEFAULT_ADDRESS6 || 'fdcc:ad94:bacf:61a4::cafe:x';
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '1.1.1.1';
module.exports.WG_DEFAULT_DNS6 = typeof process.env.WG_DEFAULT_DNS6 === 'string'
  ? process.env.WG_DEFAULT_DNS6
  : '2606:4700:4700::1111';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';

// Set WG_POST_UP to allow IPv6 NAT and forwarding only if the required kernel module is available
const modules = childProcess.execSync('lsmod', {
  shell: 'bash',
})

module.exports.WG_POST_UP = process.env.WG_POST_UP
if (!process.env.WG_POST_UP) {
  module.exports.WG_POST_UP = `
  iptables -t nat -A POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o eth0 -j MASQUERADE;
  iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT;
  iptables -A FORWARD -i wg0 -j ACCEPT;
  iptables -A FORWARD -o wg0 -j ACCEPT;`
  
  if (modules.includes("ip6table_nat")) {
    module.exports.WG_POST_UP += `ip6tables -t nat -A POSTROUTING -s ${module.exports.WG_DEFAULT_ADDRESS6.replace('x', '0')}/64 -o eth0 -j MASQUERADE;
  ip6tables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT;
  ip6tables -A FORWARD -i wg0 -j ACCEPT;
  ip6tables -A FORWARD -o wg0 -j ACCEPT;`
  }
  
  module.exports.WG_POST_UP = module.exports.WG_POST_UP.split('\n').join(' ');
}


module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || '';
