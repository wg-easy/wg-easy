'use strict';

const SQLiteDatabase = require('../lib/database/SQLite');
// const MySqlDatabase = require('../lib/database/MySql');

/*
  module.exports = {
    SQLiteDatabase: new SQLiteDatabase(),
    ...
  };
*/

module.exports = new SQLiteDatabase();
