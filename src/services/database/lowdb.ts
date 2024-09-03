import crypto from 'node:crypto';
import debug from 'debug';
import { join } from 'path';

import {
  DatabaseProvider,
  DatabaseError,
  DEFAULT_DATABASE,
} from './repositories/database';
import { JSONFilePreset } from 'lowdb/node';
import { DEFAULT_SYSTEM } from './repositories/system';

import type { Low } from 'lowdb';
import type { User } from './repositories/user';
import type { Database } from './repositories/database';

const DEBUG = debug('LowDB');

export default class LowDB extends DatabaseProvider {
  #db!: Low<Database>;

  // is this really needed?
  private async __init() {
    // TODO: assume path to db file
    const dbFilePath = join(WG_PATH, 'db.json');
    this.#db = await JSONFilePreset(dbFilePath, DEFAULT_DATABASE);
  }

  async connect() {
    try {
      // load file db
      await this.#db.read();
      DEBUG('Connected successfully');
      return;
    } catch (error) {
      DEBUG('Database does not exist : ', error);
    }

    try {
      await this.__init();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new DatabaseError(DatabaseError.ERROR_INIT);
    }

    // TODO: move to DEFAULT_DATABASE
    this.#db.update((data) => (data.system = DEFAULT_SYSTEM));

    DEBUG('Connected successfully');
  }

  async disconnect() {
    DEBUG('Disconnected successfully');
  }

  async getSystem() {
    DEBUG('Get System');
    return this.#db.data.system;
  }

  async getLang() {
    return this.#db.data.system?.lang || 'en';
  }

  async getUsers() {
    return this.#db.data.users;
  }

  async getUser(id: string) {
    DEBUG('Get User');
    return this.#db.data.users.find((user) => user.id === id);
  }

  async newUserWithPassword(username: string, password: string) {
    DEBUG('New User');

    // TODO: should be handled by zod. completely remove database error
    if (username.length < 8) {
      throw new DatabaseError(DatabaseError.ERROR_USERNAME_REQ);
    }

    if (!isPasswordStrong(password)) {
      throw new DatabaseError(DatabaseError.ERROR_PASSWORD_REQ);
    }

    const isUserExist = this.#db.data.users.find(
      (user) => user.username === username
    );
    if (isUserExist) {
      throw new DatabaseError(DatabaseError.ERROR_USER_EXIST);
    }

    const now = new Date();
    const isUserEmpty = this.#db.data.users.length === 0;

    const newUser: User = {
      id: crypto.randomUUID(),
      password: hashPassword(password),
      username,
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.#db.update((data) => data.users.push(newUser));
  }

  async updateUser(user: User) {
    let oldUser = await this.getUser(user.id);
    if (oldUser) {
      DEBUG('Update User');
      oldUser = user;
      this.#db.write();
    }
  }

  async deleteUser(id: string) {
    DEBUG('Delete User');
    const idx = this.#db.data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      this.#db.update((data) => data.users.splice(idx, 1));
    }
  }
}
