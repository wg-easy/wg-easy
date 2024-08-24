import DatabaseProvider, { type Identity } from '../database';
import type System from '../entities/system';
import type User from '../entities/user';
import debug from 'debug';

const INMDP_DEBUG = debug('InMemoryDP');

// Represent in-memory data structure
type InMemoryData = {
  system?: System;
  users: Array<User>;
};

// In-Memory Database Provider
export class InMemoryDP extends DatabaseProvider {
  private data: InMemoryData = { users: [] };

  async connect() {
    // No connection needed for in-memory
  }

  async disconnect() {
    // No disconnection needed for in-memory
  }

  async getSystem() {
    INMDP_DEBUG('Get System');
    return this.data.system || null;
  }

  async saveSystem(system: System) {
    INMDP_DEBUG('Save System');
    this.data.system = system;
  }

  async getUser(id: Identity<User>) {
    INMDP_DEBUG('Get User');
    if (typeof id === 'string') {
      return this.data.users.find((user) => user.id === id);
    }
    return this.data.users.find((user) => user.id === id.id);
  }

  async saveUser(user: User) {
    let _user = await this.getUser(user);
    if (_user) {
      INMDP_DEBUG('Update User');
      _user = user;
    } else {
      INMDP_DEBUG('New User');
      this.data.users.push(user);
    }
  }
}
