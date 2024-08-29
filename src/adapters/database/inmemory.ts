import debug from 'debug';
import packageJson from '@/package.json';

import DatabaseProvider from '~/ports/database';
import { ChartType, Lang } from '~/ports/types';
import { ROLE } from '~/ports/user/model';

import type { SessionConfig } from 'h3';
import type { System } from '~/ports/system/model';
import type { User } from '~/ports/user/model';
import type { Identity } from '~/ports/types';

const INMDP_DEBUG = debug('InMemoryDP');

// Represent in-memory data structure
type InMemoryData = {
  system?: System;
  users: Array<User>;
};

// In-Memory Database Provider
export class InMemory extends DatabaseProvider {
  protected data: InMemoryData = { users: [] };

  override async connect() {
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
      lang: Lang.EN,
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

  override async disconnect() {
    this.data = { users: [] };
  }

  override async getSystem() {
    INMDP_DEBUG('Get System');
    return this.data.system;
  }

  async saveSystem(system: System) {
    INMDP_DEBUG('Save System');
    this.data.system = system;
  }

  override async getLang() {
    return this.data.system?.lang || Lang.EN;
  }

  override async getUsers() {
    return this.data.users;
  }

  override async getUser(id: Identity<User>) {
    INMDP_DEBUG('Get User');
    if (typeof id === 'string') {
      return this.data.users.find((user) => user.id === id);
    }
    return this.data.users.find((user) => user.id === id.id);
  }

  override async saveUser(user: User) {
    let _user = await this.getUser(user);
    if (_user) {
      INMDP_DEBUG('Update User');
      _user = user;
    } else {
      INMDP_DEBUG('New User');
      if (this.data.users.length == 0) {
        // first user is admin
        user.role = ROLE.ADMIN;
      }
      this.data.users.push(user);
    }
  }

  override async deleteUser(id: Identity<User>) {
    const _id = typeof id === 'string' ? id : id.id;
    const idx = this.data.users.findIndex((user) => user.id == _id);
    if (idx !== -1) {
      this.data.users.splice(idx, 1);
    }
  }
}

export default function initInMemoryProvider() {
  const provider = new InMemory();

  provider.connect().catch((err) => {
    console.error(err);
    process.exit(1);
  });

  return provider;
}
