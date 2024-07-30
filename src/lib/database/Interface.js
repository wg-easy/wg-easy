'use strict';

const ServerError = require('../ServerError');

module.exports = class DatabaseInterface {

  constructor() {
    if (this.constructor === DatabaseInterface) {
      throw new ServerError('Abstract class "DatabaseInterface" cannot be instantiated directly');
    }
  }

  async initDb() {
    throw new ServerError('You must implement this function');
  }

  async comparePassword(username, password) {
    throw new ServerError('You must implement this function');
  }

  async updatePassword(username, oldPassword, newPassword) {
    throw new ServerError('You must implement this function');
  }

};
