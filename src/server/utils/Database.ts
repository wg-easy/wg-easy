/**
 * Changing the Database Provider
 * This design allows for easy swapping of different database implementations.
 *
 */

import InMemory from '~/adapters/database/inmemory';

const provider = new InMemory();

provider.connect().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default provider;
