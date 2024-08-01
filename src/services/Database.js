'use strict';

const Lowdb = require('../lib/database/Lowdb');
// const MySqlDatabase = require('../lib/database/MySql');

/*
  module.exports = {
    SQLiteDatabase: new SQLiteDatabase(),
    MySqlDatabase: new MySqlDatabase(),
    ...
  };
*/

module.exports = new Lowdb();
