'use strict';

const ServerError = require('../ServerError');

/**
 * All database implementations must extend this class and implement the following methods
 *
 * @abstract
 *
 */
module.exports = class DatabaseInterface {

  constructor() {
    if (this.constructor === DatabaseInterface) {
      throw new ServerError('Abstract class "DatabaseInterface" cannot be instantiated directly');
    }
  }

  /**
   * Checks if the password meets complexity requirements
   *
   * @param {string} password - The password to check
   * @returns {boolean} True if the password is complex enough, otherwise false
   */
  isPasswordComplex(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  /**
   * Initializes the database if does not exist
   *
   * @abstract
   * @returns {Promise<void>}
   * @throws {ServerError} If not implemented by the subclass
   */
  async initDb() {
    throw new ServerError('You must implement this function');
  }

  /**
   * Compares the provided password with the stored password for the given username
   *
   * @abstract
   * @param {string} username - The username of the user
   * @param {string} password - The password to compare
   * @returns {Promise<boolean>} Return `true` if the password matches, otherwise `false`
   * @throws {ServerError} If not implemented by the subclass
   */
  async comparePassword(username, password) {
    throw new ServerError('You must implement this function');
  }

  /**
   * Adds a new user to the database.
   *
   * @abstract
   * @param {string} username - The username of the new user
   * @param {string} password - The password of the new user
   * @returns {Promise<void>}
   * @throws {ServerError} If not implemented by the subclass
   * @throws {ServerError} If `password` is not complex enough
   */
  async addUser(username, password) {
    throw new ServerError('You must implement this function');
  }

  /**
   * Updates the password for the given user
   *
   * @abstract
   * @param {string} username - The username of the user
   * @param {string} oldPassword - The current password of the user
   * @param {string} newPassword - The new password to set
   * @returns {Promise<void>}
   * @throws {ServerError} If not implemented by the subclass
   * @throws {ServerError} If `newPassword` is not complex enough
   */
  async updatePassword(username, oldPassword, newPassword) {
    throw new ServerError('You must implement this function');
  }

};
