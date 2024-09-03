/**
 * Changing the Database Provider
 * This design allows for easy swapping of different database implementations.
 */

import LowDb from '~~/services/database/lowdb';

const provider = new LowDb();

provider.connect().catch((err) => {
  console.error(err);
  process.exit(1);
});

// TODO: check if old config exists and tell user about migration path

export default provider;
