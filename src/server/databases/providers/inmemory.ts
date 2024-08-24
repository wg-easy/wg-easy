import type { SessionConfig } from 'h3';
import type { Identity } from '../database';
import type UserRepository from '../repositories/user';
import type SystemRepository from '../repositories/system';
import type System from '../entities/system';
import type User from '../entities/user';

import DatabaseProvider from '../database';
import { ChartType } from '../entities/system';
import debug from 'debug';

import packageJson from '@/package.json';

const INMDP_DEBUG = debug('InMemoryDP');

// Represent in-memory data structure
type InMemoryData = {
  system?: System;
  users: Array<User>;
};

// In-Memory Database Provider
export default class InMemoryDP
  extends DatabaseProvider
  implements UserRepository, SystemRepository
{
  private data: InMemoryData = { users: [] };

  async connect() {
    INMDP_DEBUG('Connection...');
    const system: System = {
      release: packageJson.release.version,
      interface: {
        privateKey: '',
        publicKey: '',
        address: '10.8.0.1',
      },
      port: 51821,
      webuiHost: '0.0.0.0',
      sessionTimeout: 3600, // 1 hour
      lang: 'en',
      userConfig: {
        mtu: 1420,
        persistentKeepalive: 0,
        rangeAddress: '10.8.0.x',
        defaultDns: ['1.1.1.1'],
        allowedIps: ['0.0.0.0/0', '::/0'],
      },
      wgPath: '/etc/wireguard/',
      wgDevice: 'wg0',
      wgHost: '',
      wgPort: 51820,
      wgConfigPort: 51820,
      iptables: {
        wgPreUp: '',
        wgPostUp: '',
        wgPreDown: '',
        wgPostDown: '',
      },
      trafficStats: {
        enabled: false,
        type: ChartType.None,
      },
      wgEnableExpiresTime: false,
      prometheus: {
        enabled: false,
        password: null,
      },
      sessionConfig: {
        password: '',
        name: 'wg-easy',
        cookie: undefined,
      } satisfies SessionConfig,
    };

    this.data.system = system;
    INMDP_DEBUG('Connection done');
  }

  async disconnect() {
    // TODO
  }

  async getSystem() {
    INMDP_DEBUG('Get System');
    return this.data.system || null;
  }

  async saveSystem(system: System) {
    INMDP_DEBUG('Save System');
    this.data.system = system;
  }

  async getUser(id: Identity<User>) {
    INMDP_DEBUG('Get User');
    if (typeof id === 'string') {
      return this.data.users.find((user) => user.id === id);
    }
    return this.data.users.find((user) => user.id === id.id);
  }

  async saveUser(user: User) {
    let _user = await this.getUser(user);
    if (_user) {
      INMDP_DEBUG('Update User');
      _user = user;
    } else {
      INMDP_DEBUG('New User');
      this.data.users.push(user);
    }
  }
}
