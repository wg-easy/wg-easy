'use strict';

const path = require('path');
const debug = require('debug')('Database');
const bcrypt = require('bcryptjs');
const sqlite = require('sqlite3');

const DatabaseInterface = require('./Interface');
const ServerError = require('../ServerError');

const { WG_PATH } = require('../../config');

module.exports = class SQLiteDatabase extends DatabaseInterface {

  constructor() {
    super();
    this.dbPath = path.join(WG_PATH, 'db.sqlite');
    this.provider = 'SQLite';
    this.db = null;
  }

  async initDb() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite.Database(this.dbPath, async (err) => {
        if (err) {
          reject(new ServerError('Could not initialize the database'));
        }
        debug(`Connected to the SQLite database at ${this.dbPath}`);
        await this.__setupDatabase();
        resolve(true);
      });
    });
  }

  async __setupDatabase() {
    const createAdminTableQuery = `
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
        `;

    this.db.run(createAdminTableQuery, (err) => {
      if (err) {
        throw new ServerError('Could not create admin table');
      }
    });

    /* Default username is 'admin' */

    this.db.get('SELECT * FROM admin WHERE username = ?', ['admin'], async (err, row) => {
      if (err) {
        throw new ServerError('Could not query admin table');
      }

      if (!row) {
        const hashedPassword = await bcrypt.hash('admin', 12);
        this.db.run('INSERT INTO admin (username, password) VALUES (?, ?)', ['admin', hashedPassword], (err) => {
          if (err) {
            throw new ServerError('Could not create initial admin user');
          }
          debug('Init admin username:password "admin:admin"');
        });
      }
    });
  }

  async comparePassword(username, password) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT password FROM admin WHERE username = ?', [username], async (err, row) => {
        if (err || !row) {
          return reject(new ServerError('Could not query admin table'));
        }

        const isMatch = await bcrypt.compare(password, row.password);
        resolve(isMatch);
      });
    });
  }

  async updatePassword(username, oldPassword, newPassword) {
    const isMatch = await this.comparePassword(username, oldPassword);
    if (!isMatch) {
      throw new ServerError('Invalid credentials', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return new Promise((resolve, reject) => {
      this.db.run('UPDATE admin SET password = ? WHERE username = ?', [hashedPassword, username], (err) => {
        if (err) {
          return reject(new ServerError('Could not update password'));
        }

        resolve(true);
      });
    });
  }

};
