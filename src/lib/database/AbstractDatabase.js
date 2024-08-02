'use strict';

const ServerError = require('../ServerError');

module.exports = class DatabaseInterface {

  constructor() {
    if (this.constructor === DatabaseInterface) {
      throw new ServerError('Abstract class "DatabaseInterface" cannot be instantiated directly');
    }
  }

  /**
   * Initializes the database if does not exist
   *
   * @returns {Promise<void>}
   * @throws {ServerError} If not implemented by the subclass
   */
  async initDb() {
    throw new ServerError('You must implement this function');
  }

  /**
   * Compares the provided password with the stored password for the given username
   *
   * @param {string} username - The username of the user
   * @param {string} password - The password to compare
   * @returns {Promise<boolean>} - Return `true` if the password matches, otherwise `false`
   * @throws {ServerError} If not implemented by the subclass
   */
  async comparePassword(username, password) {
    throw new ServerError('You must implement this function');
  }

  /**
   * Updates the password for the given user
   *
   * @param {string} username - The username of the user
   * @param {string} oldPassword - The current password of the user
   * @param {string} newPassword - The new password to set
   * @returns {Promise<void>}
   * @throws {ServerError} If not implemented by the subclass
   */
  async updatePassword(username, oldPassword, newPassword) {
    throw new ServerError('You must implement this function');
  }

};
