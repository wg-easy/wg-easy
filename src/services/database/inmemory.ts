import debug from 'debug';
import packageJson from '@/package.json';
import crypto from 'node:crypto';

import DatabaseProvider, { DatabaseError } from './repositories/database';
import { ChartType, Lang } from './repositories/types';

import type { ID } from './repositories/types';
import type { System } from './repositories/system/model';
import type { User } from './repositories/user/model';
import { hashPassword, isPasswordStrong } from '~/server/utils/password';

const DEBUG = debug('InMemoryDB');

// Represent in-memory data structure
type InMemoryData = {
  system: System | null;
  users: User[];
};

// In-Memory Database Provider
export default class InMemory extends DatabaseProvider {
  protected data: InMemoryData = { system: null, users: [] };

  async connect() {
    DEBUG('Connection...');
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
      wgEnableOneTimeLinks: false,
      wgEnableSortClients: false,
      prometheus: {
        enabled: false,
        password: null,
      },
      sessionConfig: {
        password: '',
        name: 'wg-easy',
        cookie: undefined,
      },
    };

    this.data.system = system;
    DEBUG('Connection done');
  }

  async disconnect() {
    this.data = { system: null, users: [] };
  }

  async getSystem() {
    DEBUG('Get System');
    return this.data.system;
  }

  async getLang() {
    return this.data.system?.lang || Lang.EN;
  }

  async getUsers() {
    return this.data.users;
  }

  async getUser(id: ID) {
    DEBUG('Get User');
    return this.data.users.find((user) => user.id === id);
  }

  async newUserWithPassword(username: string, password: string) {
    DEBUG('New User');

    if (username.length < 8) {
      throw new DatabaseError(DatabaseError.ERROR_USERNAME_REQ);
    }

    if (!isPasswordStrong(password)) {
      throw new DatabaseError(DatabaseError.ERROR_PASSWORD_REQ);
    }

    const isUserExist = this.data.users.find(
      (user) => user.username === username
    );
    if (isUserExist) {
      throw new DatabaseError(DatabaseError.ERROR_USER_EXIST);
    }

    const now = new Date();
    const isUserEmpty = this.data.users.length === 0;

    const newUser: User = {
      id: crypto.randomUUID(),
      password: hashPassword(password),
      username,
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(newUser);
  }

  async updateUser(user: User) {
    let _user = await this.getUser(user.id);
    if (_user) {
      DEBUG('Update User');
      _user = user;
    }
  }

  async deleteUser(id: ID) {
    DEBUG('Delete User');
    const idx = this.data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      this.data.users.splice(idx, 1);
    }
  }
}
