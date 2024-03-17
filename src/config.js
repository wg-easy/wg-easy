'use strict';

const { release } = require('./package.json');
const path = require('path');
const dirFullPath = path.resolve(__dirname);

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || '51821';
module.exports.WEBUI_HOST = process.env.WEBUI_HOST || '0.0.0.0';
module.exports.PASSWORD = process.env.PASSWORD || '';
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_DEVICE = process.env.WG_DEVICE || 'ens3';
module.exports.WG_HOST = process.env.WG_HOST || 'oracle-daily.duckdns.org';
module.exports.WG_PORT = 51820;
module.exports.WG_MTU = process.env.WG_MTU || 1412;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 25;
module.exports.WG_DEFAULT_ADDRESS = process.env.WG_DEFAULT_ADDRESS || '10.250.1.x';
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '10.250.0.2';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '10.250.0.0/22, 10.254.1.0/24';

module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
// module.exports.WG_POST_UP = '/app/wg0-post-up.sh';
module.exports.WG_POST_UP = path.resolve(__dirname, './wgsh/wg0-post-up.sh');

module.exports.WG_PRE_DOWN = path.resolve(__dirname, './wgsh/wg0-pre-down.sh');
module.exports.WG_POST_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.LANG = process.env.LANG || 'en';
module.exports.UI_TRAFFIC_STATS = process.env.UI_TRAFFIC_STATS || 'true';
