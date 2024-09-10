/**
 * Changing the Database Provider
 * This design allows for easy swapping of different database implementations.
 */

import LowDb from '~~/services/database/lowdb';

const nullObject = new Proxy(
  {},
  {
    get() {
      throw new Error('Database not yet initialized');
    },
  }
);

// eslint-disable-next-line import/no-mutable-exports
let provider = nullObject as never as LowDb;

LowDb.connect().then((v) => {
  provider = v;
  WireGuard.Startup();
});

// TODO: check if old config exists and tell user about migration path
export default provider;
