import crypto from 'node:crypto';
import debug from 'debug';
import { JSONFilePreset } from 'lowdb/node';
import type { Low } from 'lowdb';
import type { DeepReadonly } from 'vue';
import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';

import {
  DatabaseProvider,
  DatabaseError,
  DEFAULT_DATABASE,
} from './repositories/database';
import { UserRepository, type User } from './repositories/user';
import type { Database } from './repositories/database';
import { migrationRunner } from './migrations';
import {
  ClientRepository,
  type UpdateClient,
  type CreateClient,
  type OneTimeLink,
} from './repositories/client';
import {
  SystemRepository,
  type General,
  type UpdateWGConfig,
  type UpdateWGInterface,
  type WGHooks,
} from './repositories/system';
import { SetupRepository, type Steps } from './repositories/setup';

const DEBUG = debug('LowDB');

export class LowDBSetup extends SetupRepository {
  #db: Low<Database>;
  constructor(db: Low<Database>) {
    super();
    this.#db = db;
  }
  async done() {
    if (this.#db.data.setup === 'success') {
      return true;
    }
    return false;
  }

  async get() {
    return this.#db.data.setup;
  }

  async set(step: Steps) {
    this.#db.update((v) => {
      v.setup = step;
    });
  }
}

/**
 * deep copies object and
 * makes readonly on type level
 */
function makeReadonly<T>(a: T): DeepReadonly<T> {
  return structuredClone(a) as DeepReadonly<T>;
}

class LowDBSystem extends SystemRepository {
  #db: Low<Database>;
  constructor(db: Low<Database>) {
    super();
    this.#db = db;
  }

  async get() {
    DEBUG('Get System');
    const system = this.#db.data.system;
    // system is only null if migration failed
    if (system === null) {
      throw new DatabaseError(DatabaseError.ERROR_INIT);
    }
    return makeReadonly(system);
  }

  async updateClientsHostPort(host: string, port: number): Promise<void> {
    DEBUG('Update Clients Host and Port endpoint');
    this.#db.update((v) => {
      v.system.userConfig.host = host;
      v.system.userConfig.port = port;
    });
  }

  async updateGeneral(general: General) {
    DEBUG('Update General');
    this.#db.update((v) => {
      v.system.general = general;
    });
  }

  async updateInterface(wgInterface: UpdateWGInterface) {
    DEBUG('Update Interface');
    this.#db.update((v) => {
      const oldInterface = v.system.interface;
      v.system.interface = {
        ...oldInterface,
        ...wgInterface,
      };
    });
  }

  async updateUserConfig(userConfig: UpdateWGConfig) {
    DEBUG('Update User Config');
    this.#db.update((v) => {
      const oldUserConfig = v.system.userConfig;
      v.system.userConfig = {
        ...oldUserConfig,
        ...userConfig,
      };
    });
  }

  async updateHooks(hooks: WGHooks) {
    DEBUG('Update Hooks');
    this.#db.update((v) => {
      v.system.hooks = hooks;
    });
  }

  /**
   * updates the address range and the interface address
   */
  async updateAddressRange(address4Range: string, address6Range: string) {
    DEBUG('Update Address Range');
    const cidr4 = parseCidr(address4Range);
    const cidr6 = parseCidr(address6Range);
    this.#db.update((v) => {
      v.system.userConfig.address4Range = address4Range;
      v.system.userConfig.address6Range = address6Range;
      v.system.interface.address4 = stringifyIp({
        number: cidr4.start + 1n,
        version: 4,
      });
      v.system.interface.address6 = stringifyIp({
        number: cidr6.start + 1n,
        version: 6,
      });
    });
  }
}

class LowDBUser extends UserRepository {
  #db: Low<Database>;
  constructor(db: Low<Database>) {
    super();
    this.#db = db;
  }

  async findAll() {
    return makeReadonly(this.#db.data.users);
  }

  async findById(id: string) {
    DEBUG('Get User');
    return makeReadonly(this.#db.data.users.find((user) => user.id === id));
  }

  async create(username: string, password: string) {
    DEBUG('Create User');

    const isUserExist = this.#db.data.users.find(
      (user) => user.username === username
    );
    if (isUserExist) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Username already taken',
      });
    }

    const now = new Date().toISOString();
    const isUserEmpty = this.#db.data.users.length === 0;

    const hash = await hashPassword(password);

    const newUser: User = {
      id: crypto.randomUUID(),
      password: hash,
      username,
      email: null,
      name: 'Administrator',
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.#db.update((data) => data.users.push(newUser));
  }

  async update(user: User) {
    // TODO: avoid mutation, prefer .update, updatedAt
    let oldUser = await this.findById(user.id);
    if (oldUser) {
      DEBUG('Update User');
      oldUser = user;
      await this.#db.write();
    }
  }

  async delete(id: string) {
    DEBUG('Delete User');
    const idx = this.#db.data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      await this.#db.update((data) => data.users.splice(idx, 1));
    }
  }
}

class LowDBClient extends ClientRepository {
  #db: Low<Database>;
  constructor(db: Low<Database>) {
    super();
    this.#db = db;
  }
  async findAll() {
    DEBUG('GET Clients');
    return makeReadonly(this.#db.data.clients);
  }

  async findById(id: string) {
    DEBUG('Get Client');
    return makeReadonly(this.#db.data.clients[id]);
  }

  async create(client: CreateClient) {
    DEBUG('Create Client');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newClient = { ...client, createdAt: now, updatedAt: now, id };
    await this.#db.update((data) => {
      data.clients[id] = newClient;
    });
  }

  async delete(id: string) {
    DEBUG('Delete Client');
    await this.#db.update((data) => {
      // TODO: find something better than delete
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete data.clients[id];
    });
  }

  async toggle(id: string, enable: boolean) {
    DEBUG('Toggle Client');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].enabled = enable;
      }
    });
  }

  async updateExpirationDate(id: string, expirationDate: string | null) {
    DEBUG('Update Client Expiration Date');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].expiresAt = expirationDate;
      }
    });
  }

  async deleteOneTimeLink(id: string) {
    DEBUG('Delete Client One Time Link');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        if (data.clients[id].oneTimeLink) {
          // Bug where Client makes 2 requests
          data.clients[id].oneTimeLink.expiresAt = new Date(
            Date.now() + 10 * 1000
          ).toISOString();
        }
      }
    });
  }

  async createOneTimeLink(id: string, oneTimeLink: OneTimeLink) {
    DEBUG('Create Client One Time Link');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].oneTimeLink = oneTimeLink;
      }
    });
  }

  async update(id: string, client: UpdateClient) {
    DEBUG('Create Client');
    const now = new Date().toISOString();
    await this.#db.update((data) => {
      const oldClient = data.clients[id];
      if (!oldClient) {
        return;
      }
      data.clients[id] = {
        ...oldClient,
        ...client,
        updatedAt: now,
      };
    });
  }
}

export default class LowDB extends DatabaseProvider {
  #db: Low<Database>;

  setup: LowDBSetup;
  system: LowDBSystem;
  user: LowDBUser;
  client: LowDBClient;

  private constructor(db: Low<Database>) {
    super();
    this.#db = db;
    this.setup = new LowDBSetup(this.#db);
    this.system = new LowDBSystem(this.#db);
    this.user = new LowDBUser(this.#db);
    this.client = new LowDBClient(this.#db);
  }

  async runMigrations() {
    await migrationRunner(this.#db);
  }

  /**
   * @throws
   */
  static override async connect() {
    try {
      DEBUG('Connecting...');
      const db = await JSONFilePreset(
        '/etc/wireguard/db.json',
        DEFAULT_DATABASE
      );
      const inst = new LowDB(db);
      DEBUG('Running Migrations...');
      await inst.runMigrations();
      DEBUG('Migrations ran successfully.');
      DEBUG('Connected successfully.');
      return inst;
    } catch (e) {
      DEBUG(e);
      throw new Error('Failed to initialize Database');
    }
  }

  async disconnect() {
    DEBUG('Disconnected successfully');
  }
}
