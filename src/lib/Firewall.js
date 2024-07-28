'use strict';

const { existsSync } = require('fs');
const path = require('path');
const debug = require('debug')('Firewall');

const Util = require('./Util');

const WG_IPT_CHAIN_NAME = 'WGEASY';
const WG_IPT_FILE_RULE_NAME = 'fw.rules';

const { WG_PATH } = require('../config');

module.exports = class Firewall {

  async init() {
    try {
      this.rulesFile = path.join(WG_PATH, WG_IPT_FILE_RULE_NAME);
      const configFile = this.rulesFile;
      if (existsSync(configFile)) {
        await this.__restoreIptablesRules();
      }
      // check otherwise create
      await Util.exec(`iptables -L ${WG_IPT_CHAIN_NAME} -n`);
    } catch (error) {
      debug(`Create rules on chain "${WG_IPT_CHAIN_NAME}"...`);
      await Util.exec(`iptables -N ${WG_IPT_CHAIN_NAME}`);
      await this.__saveIptablesRules();
      debug('Rules created.');
    }
  }

  async __saveIptablesRules() {
    debug('Rules saving...');
    const configFile = this.rulesFile;
    await Util.exec(`iptables-save > ${configFile}`);
    debug('Rules saved.');
  }

  async __restoreIptablesRules() {
    debug('Rules restoring...');
    const configFile = this.rulesFile;
    await Util.exec(`iptables-restore < ${configFile}`);
    debug('Rules restored.');
  }

  async getIptablesRules() {
    // iptables list the rules WG_IPT_CHAIN_NAME chain
    //
    // $ iptables -L WGEASY -nv --line-numbers
    // Chain WGEASY (0 references)
    // num   pkts bytes target     prot opt in     out     source               destination
    // 1        0     0 ACCEPT     6    --  *      *       172.16.7.2           10.8.2.5          tcp spt:22565 dpt:53
    //
    // $ iptables -L ${WG_IPT_CHAIN_NAME} -nv --line-numbers | awk '{print $1,$4,$5,$9,$10,$12,$13}'
    // Chain (0 references)
    // num target prot source destination
    // 1 ACCEPT 6 172.16.7.2 10.8.2.5
    const stdout = await Util.exec(`iptables -L ${WG_IPT_CHAIN_NAME} -nv --line-numbers | awk '{print $1,$4,$5,$9,$10,$12,$13}'`);

    const lines = stdout.split(/\r?\n/);
    const rules = lines.slice(2).map((line) => {
      const [num, target, protocol, source, destination, spt, dpt] = line.trim().split(' ');
      const targetToName = Util.getTargetName(target);
      const protocolToName = Util.getProtocolName(protocol);

      let newSource = source;
      let newDestination = destination;

      if (spt) {
        // eslint-disable-next-line no-unused-vars
        const [_, sPort] = spt.split(':');
        if (spt.startsWith('spt')) {
          newSource += `:${sPort}`;
        }
        if (spt.startsWith('dpt')) {
          newDestination += `:${sPort}`;
        }
      }

      if (dpt) {
        // eslint-disable-next-line no-unused-vars
        const [_, dPort] = dpt.split(':');
        newDestination += `:${dPort}`;
      }

      return {
        num, target: targetToName, source: newSource, destination: newDestination, protocol: protocolToName,
      };
    }).filter((rule) => rule !== null);

    return JSON.stringify(rules);
  }

  async addIptablesRule(source, destination, protocol, target) {
    debug('Rule adding...');
    // Validate target & protocol
    if (!Util.isTarget(target) || !Util.isProtocol(protocol)) {
      throw new Error('Invalid target or protocol.');
    }

    /*
      Support command :
      iptables -A CHAIN -s [IPv4 | IPv4/CIDR] -d [IPv4 | IPv4/CIDR] -p PROTOCOL [--sport PORT] [--dport PORT] -j TARGET
    */

    let iptablesCommand = `iptables -A ${WG_IPT_CHAIN_NAME}`;

    if (Util.isSupportedAddress(source) && Util.isSupportedAddress(destination)) {
      const [sAddress, sPort] = source.split(':');
      const [dAddress, dPort] = destination.split(':');
      if (Util.isIPAddress(sAddress) || Util.isCIDR(sAddress)) {
        iptablesCommand += ` -s ${sAddress}`;
      } else {
        throw new Error('Invalid source address.');
      }
      if (Util.isIPAddress(dAddress) || Util.isCIDR(dAddress)) {
        iptablesCommand += ` -d ${dAddress}`;
      } else {
        throw new Error('Invalid destination address.');
      }
      iptablesCommand += ` -p ${protocol}`;
      if (sPort) {
        iptablesCommand += ` --sport ${sPort}`;
      }
      if (dPort) {
        iptablesCommand += ` --dport ${dPort}`;
      }
    } else {
      throw new Error('Invalid source/destination format.');
    }

    iptablesCommand += ` -j ${target}`;

    await Util.exec(iptablesCommand);
    await this.__saveIptablesRules();
    debug('Rule added');
  }

  async deleteIptablesRule(num) {
    debug('Rule deleting...');
    await Util.exec(`iptables -D ${WG_IPT_CHAIN_NAME} ${num}`);
    await this.__saveIptablesRules();
    debug('Rule deleted.');
  }

  async getInterfaces() {
    // $ ip -brief address show
    // lo               UNKNOWN        127.0.0.1/8 ::1/128
    // eth0@if150       UP             172.17.0.3/16
    // $ ip -brief address show | awk '{print $1,$3,$4}'
    // lo 127.0.0.1/8 ::1/128
    // eth0@if150 172.17.0.3/16
    const interfaces = await Util.exec("ip -brief a s | awk '{print $1,$3,$4}'");

    const result = [];
    if (typeof interfaces === 'string') {
      for (const line of interfaces.split(/\r?\n/)) {
        const [name, ipv4, ipv6] = line.split(' ');
        result.push({
          name, ipv4: ipv4 || '', ipv6: ipv6 || '',
        });
      }
    }

    return JSON.stringify(result);
  }

};
