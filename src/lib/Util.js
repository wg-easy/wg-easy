'use strict';

const childProcess = require('child_process');

const Protocol = Object.freeze({
  ALL: 0,
  TCP: 6,
  UDP: 17,
});

const ProtocolName = Object.freeze({
  [Protocol.ALL]: '*',
  [Protocol.TCP]: 'TCP',
  [Protocol.UDP]: 'UDP',
});

const Target = Object.freeze({
  RETURN: 'RETURN',
  ALLOW: 'ACCEPT',
  BLOCK: 'DROP',
});

const TargetName = Object.freeze({
  [Target.RETURN]: '*',
  [Target.ALLOW]: 'ALLOW',
  [Target.BLOCK]: 'BLOCK',
});

module.exports = class Util {

  static isValidIPv4(str) {
    const blocks = str.split('.');
    if (blocks.length !== 4) return false;

    for (let value of blocks) {
      value = parseInt(value, 10);
      if (Number.isNaN(value)) return false;
      if (value < 0 || value > 255) return false;
    }

    return true;
  }

  static promisify(fn) {
    // eslint-disable-next-line func-names
    return function(req, res) {
      Promise.resolve().then(async () => fn(req, res))
        .then((result) => {
          if (res.headersSent) return;

          if (typeof result === 'undefined') {
            return res
              .status(204)
              .end();
          }

          return res
            .status(200)
            .json(result);
        })
        .catch((error) => {
          if (typeof error === 'string') {
            error = new Error(error);
          }

          // eslint-disable-next-line no-console
          console.error(error);

          return res
            .status(error.statusCode || 500)
            .json({
              error: error.message || error.toString(),
              stack: error.stack,
            });
        });
    };
  }

  static async exec(cmd, {
    log = true,
  } = {}) {
    if (typeof log === 'string') {
      // eslint-disable-next-line no-console
      console.log(`$ ${log}`);
    } else if (log === true) {
      // eslint-disable-next-line no-console
      console.log(`$ ${cmd}`);
    }

    if (process.platform !== 'linux') {
      return '';
    }

    return new Promise((resolve, reject) => {
      childProcess.exec(cmd, {
        shell: 'bash',
      }, (err, stdout) => {
        if (err) return reject(err);
        return resolve(String(stdout).trim());
      });
    });
  }

  static isCIDR(ip) {
    // https://stackoverflow.com/a/27434991
    const cidrRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[12][0-9]|3[0-2]))$/;
    return cidrRegex.test(ip);
  }

  static isIPAddress(ip) {
    // https://stackoverflow.com/a/27434991
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  static isValidIptablesTarget(target) {
    return Object.values(Target).includes(target);
  }

  static isValidIptablesProtocol(protocol) {
    return Object.keys(Protocol).includes(protocol);
  }

  static getProtocolName(protocolNumber) {
    return ProtocolName[protocolNumber] || 'Unknown Protocol';
  }

  static getTargetName(target) {
    return TargetName[target] || 'Unknown Target';
  }

};
