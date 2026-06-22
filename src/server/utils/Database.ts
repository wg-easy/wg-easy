import WireGuard from '#server/utils/WireGuard';
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

connect()
  .then((db) => {
    provider = db;
    WireGuard.Startup();
  })
  .catch((err) => {
    console.log('Failed to connect to Database:', err);
    process.exit(1);
  });

export default provider;
