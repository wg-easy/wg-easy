import crypto from 'node:crypto';
import debug from 'debug';
import { join } from 'path';

import DatabaseProvider, { DatabaseError } from './repositories/database';
import { hashPassword, isPasswordStrong } from '~/server/utils/password';
import { JSONFilePreset } from 'lowdb/node';
import { Lang } from './repositories/types';
import SYSTEM from './repositories/system';

import type { User } from './repositories/user/model';
import type { DBData } from './repositories/database';
import type { ID } from './repositories/types';
import type { Low } from 'lowdb';

const DEBUG = debug('LowDB');

export default class LowDB extends DatabaseProvider {
  private _db!: Low<DBData>;

  private async __init() {
    // TODO: assume path to db file
    const dbFilePath = join(WG_PATH, 'db.json');
    this._db = await JSONFilePreset(dbFilePath, this.data);
  }

  async connect() {
    try {
      // load file db
      await this._db.read();
      DEBUG('Connection done');
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

    this._db.update((data) => (data.system = SYSTEM));

    DEBUG('Connection done');
  }

  async disconnect() {
    DEBUG('Diconnect done');
  }

  async getSystem() {
    DEBUG('Get System');
    return this._db.data.system;
  }

  async getLang() {
    return this._db.data.system?.lang || Lang.EN;
  }

  async getUsers() {
    return this._db.data.users;
  }

  async getUser(id: ID) {
    DEBUG('Get User');
    return this._db.data.users.find((user) => user.id === id);
  }

  async newUserWithPassword(username: string, password: string) {
    DEBUG('New User');

    if (username.length < 8) {
      throw new DatabaseError(DatabaseError.ERROR_USERNAME_REQ);
    }

    if (!isPasswordStrong(password)) {
      throw new DatabaseError(DatabaseError.ERROR_PASSWORD_REQ);
    }

    const isUserExist = this._db.data.users.find(
      (user) => user.username === username
    );
    if (isUserExist) {
      throw new DatabaseError(DatabaseError.ERROR_USER_EXIST);
    }

    const now = new Date();
    const isUserEmpty = this._db.data.users.length === 0;

    const newUser: User = {
      id: crypto.randomUUID(),
      password: hashPassword(password),
      username,
      role: isUserEmpty ? 'ADMIN' : 'CLIENT',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this._db.update((data) => data.users.push(newUser));
  }

  async updateUser(user: User) {
    let _user = await this.getUser(user.id);
    if (_user) {
      DEBUG('Update User');
      _user = user;
      this._db.write();
    }
  }

  async deleteUser(id: ID) {
    DEBUG('Delete User');
    const idx = this._db.data.users.findIndex((user) => user.id === id);
    if (idx !== -1) {
      this._db.update((data) => data.users.splice(idx, 1));
    }
  }
}
