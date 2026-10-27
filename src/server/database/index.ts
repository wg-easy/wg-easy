import type { DatabaseStore } from './store';

let database: DatabaseStore | undefined;

/** Startup owns the connection; importing a feature never opens a database. */
export function setDatabase(store: DatabaseStore) {
  database = store;
}

export function getDatabase(): DatabaseStore {
  if (!database) throw new Error('Database not yet initialized');
  return database;
}
