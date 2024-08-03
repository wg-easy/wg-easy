'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const debug = require('debug')('Database');
const bcrypt = require('bcryptjs');

const ServerError = require('../ServerError');
const DatabaseInterface = require('./AbstractDatabase');

const { WG_PATH } = require('../../config');

/**
 *
 * @typedef {Object} Role
 * @property {string} ADMIN - Represents an ADMIN user
 *
 * @typedef {Object} User
 * @property {number} id - The unique identifier of user
 * @property {string} username - The username of user
 * @property {string} password - The password of user
 * @property {Array<Role[keyof Role]>} roles - All roles of user
 *
 * @typedef {Object} Model
 * @property {Array<User>} users
 */

/**
 * @type {Role}
 */
const Role = {
  ADMIN: 'admin',
};

/**
 * @type {Model}
 */
const Model = {};

module.exports = class Lowdb extends DatabaseInterface {

  constructor() {
    super();
    this.dbPath = path.join(WG_PATH, 'db.json');
    this.db = null;
  }

  async initDb() {
    // each function must call this method to check if the file exist
    // lowdb is an esm module
    // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/no-unresolved, node/no-missing-import
    const { JSONFilePreset } = await import('lowdb/node');
    this.db = await JSONFilePreset(this.dbPath, Model);

    await this.db.read();

    if (!this.db.data.users) {
      debug(`Created new database at ${this.dbPath}`);
      this.db.data = { users: [] };
      await this.db.write();
    }
  }

  async comparePassword(username, password) {
    debug('Compare password');
    this.initDb();

    const user = this.db.data.users.find((u) => u.username === username);
    if (!user) {
      throw new ServerError('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
  }

  async updatePassword(username, oldPassword, newPassword) {
    debug('Update password');
    this.initDb();

    if (!super.isPasswordComplex(newPassword)) {
      throw new ServerError('Password does not meet complexity requirements : 8 characters minimum, uppercase, lowercase, number and special char');
    }

    const user = this.db.data.users.find((u) => u.username === username);
    if (!user) {
      throw new ServerError('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new ServerError('Old password is incorrect');
    }

    // lowdb is atomic
    user.password = await bcrypt.hash(newPassword, 12);
    await this.db.write();
  }

  async addUser(username, password) {
    debug('Add user');
    this.initDb();

    if (!super.isPasswordComplex(password)) {
      throw new ServerError('Password does not meet complexity requirements, minimum 8 characters, uppercase, lowercase, number and special char');
    }

    const user_ = this.db.data.users.find((u) => u.username === username);
    if (user_) {
      throw new ServerError('User does already exist');
    }

    const userPassword = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      username,
      password: userPassword,
      roles: [],
    };

    this.db.data.users.push(user);
    await this.db.write();
  }

  async addAdminUser(username, password) {
    debug('Add admin user');
    this.initDb();

    if (!this.firstSetupAuth()) {
      // for the time being, when the first setup, this method is auth to be called, otherwise throw
      throw new ServerError('Could not add an admin user', 405);
    }

    if (!super.isPasswordComplex(password)) {
      throw new ServerError('Password does not meet complexity requirements, minimum 8 characters, uppercase, lowercase, number and special char', 403);
    }

    const user_ = this.db.data.users.find((u) => u.username === username);
    if (user_) {
      throw new ServerError('User does already exist', 403);
    }

    const userPassword = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      username,
      password: userPassword,
      roles: [Role.ADMIN],
    };

    this.db.data.users.push(user);
    await this.db.write();
  }

  firstSetupAuth() {
    this.initDb();

    return this.db.data.users.length === 0;
  }

};
