/**
 * Changing the Database Provider
 * This design allows for easy swapping of different database implementations.
 */
import { connect, type DBServiceType } from '#db/sqlite';

const nullObject = new Proxy(
  {},
  {
    get() {
      throw new Error('Database not yet initialized');
    },
  }
);

// eslint-disable-next-line import/no-mutable-exports
let provider = nullObject as never as DBServiceType;

connect().then((db) => {
  provider = db;
  WireGuard.Startup();
});

export default provider;
