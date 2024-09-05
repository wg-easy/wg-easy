import crypto from 'node:crypto';
import debug from 'debug';
import { join } from 'path';

import {
  DatabaseProvider,
  DatabaseError,
  DEFAULT_DATABASE,
} from './repositories/database';
import { JSONFilePreset } from 'lowdb/node';

import type { Low } from 'lowdb';
import type { User } from './repositories/user';
import type { Database } from './repositories/database';
import { migrationRunner } from './migrations';
import type { Client, NewClient, OneTimeLink } from './repositories/client';

const DEBUG = debug('LowDB');

export default class LowDB extends DatabaseProvider {
  #db!: Low<Database>;
  #connected = false;

  private async __init() {
    const dbFilePath = join(WG_PATH, 'db.json');
    this.#db = await JSONFilePreset(dbFilePath, DEFAULT_DATABASE);
  }

  /**
   * @throws
   */
  async connect() {
    if (this.#connected) {
      return;
    }
    try {
      await this.__init();
      DEBUG('Running Migrations');
      await migrationRunner(this.#db);
      DEBUG('Migrations ran successfully');
    } catch (e) {
      DEBUG(e);
      throw new Error('Failed to initialize Database');
    }
    this.#connected = true;
    DEBUG('Connected successfully');
  }

  get connected() {
    return this.#connected;
  }

  async disconnect() {
    this.#connected = false;
    DEBUG('Disconnected successfully');
  }

  async getSystem() {
    DEBUG('Get System');
    const system = this.#db.data.system;
    // system is only null if migration failed
    if (system === null) {
      throw new DatabaseError(DatabaseError.ERROR_INIT);
    }
    return system;
  }

  // TODO: return copy to avoid mutation (everywhere)
  async getUsers() {
    return this.#db.data.users;
  }

  async getUser(id: string) {
    DEBUG('Get User');
    return this.#db.data.users.find((user) => user.id === id);
  }

  async createUser(username: string, password: string) {
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
      name: 'Administrator',
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.#db.update((data) => data.users.push(newUser));
  }

  async updateUser(user: User) {
    // TODO: avoid mutation, prefer .update, updatedAt
    let oldUser = await this.getUser(user.id);
    if (oldUser) {
      DEBUG('Update User');
      oldUser = user;
      await this.#db.write();
    }
  }

  async deleteUser(id: string) {
    DEBUG('Delete User');
    const idx = this.#db.data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      await this.#db.update((data) => data.users.splice(idx, 1));
    }
  }

  async getClients() {
    DEBUG('GET Clients');
    return this.#db.data.clients;
  }

  async getClient(id: string) {
    DEBUG('Get Client');
    return this.#db.data.clients[id];
  }

  async createClient(client: NewClient) {
    DEBUG('Create Client');
    const now = new Date().toISOString();
    const newClient: Client = { ...client, createdAt: now, updatedAt: now };
    await this.#db.update((data) => {
      data.clients[client.id] = newClient;
    });
  }

  async deleteClient(id: string) {
    DEBUG('Delete Client');
    await this.#db.update((data) => {
      // TODO: find something better than delete
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete data.clients[id];
    });
  }

  async toggleClient(id: string, enable: boolean) {
    DEBUG('Toggle Client');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].enabled = enable;
      }
    });
  }

  async updateClientName(id: string, name: string) {
    DEBUG('Update Client Name');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].name = name;
      }
    });
  }

  async updateClientAddress4(id: string, address4: string) {
    DEBUG('Update Client Address4');
    await this.#db.update((data) => {
      if (data.clients[id]) {
        data.clients[id].address4 = address4;
      }
    });
  }

  async updateClientExpirationDate(id: string, expirationDate: string | null) {
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
}
