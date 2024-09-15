import { DatabaseSync } from 'node:sqlite';

const Sqlite = new DatabaseSync(':memory:');

Sqlite.exec('DROP TABLE mamamia;');

export default Sqlite;
