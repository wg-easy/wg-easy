'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const debug = require('debug')('Database');
const bcrypt = require('bcryptjs');

const ServerError = require('../ServerError');
const DatabaseInterface = require('./AbstractDatabase');

const { WG_PATH } = require('../../config');

/** *
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

/** *
 * @type {Role}
 */
const Role = {
  ADMIN: 'admin',
};

/** *
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
    debug('Loading database...');
    // lowdb is esm module
    // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/no-unresolved, node/no-missing-import
    const { JSONFilePreset } = await import('lowdb/node');
    this.db = await JSONFilePreset(this.dbPath, Model);
    await this.db.read();

    if (!this.db.data.users) {
      this.db.data = { users: [] };
      const defaultPassword = process.env.PASSWORD_HASH || await bcrypt.hash(process.env.PASSWORD || 'admin', 12);
      const adminUser = {
        id: uuidv4(),
        username: 'admin',
        password: defaultPassword,
        roles: [Role.ADMIN],
      };
      this.db.data.users.push(adminUser);
      await this.db.write();
      debug(`Created new database at ${this.dbPath}`);
    }
  }

  async comparePassword(username, password) {
    debug('Compare password');
    const user = this.db.data.users.find((u) => u.username === username);
    if (!user) {
      throw new ServerError('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
  }

  async updatePassword(username, oldPassword, newPassword) {
    debug('Update password');
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

};
