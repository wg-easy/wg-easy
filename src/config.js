'use strict';

const ip = require('ip');

const { release } = require('./package.json');

function parseDefaultAddress(defaultAddress) {
  // Set the default full address with subnet if it's not provided
  const defaultFullAddress = defaultAddress || '10.8.0.0/24';

  // Check if the address ends with '.x', if so, replace with '.0/24'
  const addressWithSubnet = defaultFullAddress.endsWith('.x')
    ? defaultFullAddress.replace('.x', '.0/24')
    : defaultFullAddress;

  const [ipAddress, subnetRange] = addressWithSubnet.split('/');

  return {
    ipAddress,
    subnetRange: subnetRange || '24', // Default subnet range to 24 if not provided
  };
}

// Use the function to parse the environment variable or default to '10.8.0.0/24'
const { ipAddress, subnetRange } = parseDefaultAddress(process.env.WG_DEFAULT_ADDRESS);

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.WEBUI_HOST = process.env.WEBUI_HOST || '0.0.0.0';
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_DEVICE = process.env.WG_DEVICE || 'eth0';
module.exports.WG_HOST = process.env.WG_HOST;
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_MTU = process.env.WG_MTU || null;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 0;
module.exports.WG_DEFAULT_ADDRESS = ipAddress;
module.exports.WG_DEFAULT_ADDRESS_RANGE = subnetRange;
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '1.1.1.1';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';

module.exports.WG_SUBNET = ip.subnet(module.exports.WG_DEFAULT_ADDRESS, `255.255.255.${256 - 2 ** (32 - module.exports.WG_DEFAULT_ADDRESS_RANGE)}`);
module.exports.WG_SERVER_ADDRESS = module.exports.WG_SUBNET.firstAddress;
module.exports.WG_CLIENT_FIRST_ADDRESS = ip.toLong(module.exports.WG_SERVER_ADDRESS) + 1;
module.exports.WG_CLIENT_LAST_ADDRESS = ip.toLong(module.exports.WG_SUBNET.lastAddress) - 1; // Exclude the broadcast address

module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = process.env.WG_POST_UP || `
iptables -t nat -A POSTROUTING -s ${module.exports.WG_SERVER_ADDRESS}/${module.exports.WG_DEFAULT_ADDRESS_RANGE} -o ${module.exports.WG_DEVICE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
`.split('\n').join(' ');

module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || '';
module.exports.LANG = process.env.LANG || 'en';
