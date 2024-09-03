import crypto from 'node:crypto';
import debug from 'debug';

import {
  DatabaseProvider,
  DatabaseError,
  DEFAULT_DATABASE,
} from './repositories/database';
import { hashPassword, isPasswordStrong } from '~/server/utils/password';
import { DEFAULT_SYSTEM } from './repositories/system';

import type { User } from './repositories/user';

const DEBUG = debug('InMemoryDB');

export default class InMemory extends DatabaseProvider {
  #data = DEFAULT_DATABASE;

  async connect() {
    this.#data.system = DEFAULT_SYSTEM;
    DEBUG('Connected  successfully');
  }

  async disconnect() {
    this.#data = { system: null, users: [] };
    DEBUG('Disconnected successfully');
  }

  async getSystem() {
    DEBUG('Get System');
    return this.#data.system;
  }

  async getLang() {
    return this.#data.system?.lang || 'en';
  }

  async getUsers() {
    return this.#data.users;
  }

  async getUser(id: string) {
    DEBUG('Get User');
    return this.#data.users.find((user) => user.id === id);
  }

  async newUserWithPassword(username: string, password: string) {
    DEBUG('New User');

    if (username.length < 8) {
      throw new DatabaseError(DatabaseError.ERROR_USERNAME_REQ);
    }

    if (!isPasswordStrong(password)) {
      throw new DatabaseError(DatabaseError.ERROR_PASSWORD_REQ);
    }

    const isUserExist = this.#data.users.find(
      (user) => user.username === username
    );
    if (isUserExist) {
      throw new DatabaseError(DatabaseError.ERROR_USER_EXIST);
    }

    const now = new Date();
    const isUserEmpty = this.#data.users.length === 0;

    const newUser: User = {
      id: crypto.randomUUID(),
      password: hashPassword(password),
      username,
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.#data.users.push(newUser);
  }

  async updateUser(user: User) {
    let oldUser = await this.getUser(user.id);
    if (oldUser) {
      DEBUG('Update User');
      oldUser = user;
    }
  }

  async deleteUser(id: string) {
    DEBUG('Delete User');
    const idx = this.#data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      this.#data.users.splice(idx, 1);
    }
  }
}
