/**
 * Changing the Database Provider
 * This design allows for easy swapping of different database implementations.
 *
 */

import initInMemoryProvider from '~/adapters/database/inmemory';

export default defineNuxtPlugin(() => {
  return {
    provide: {
      database: initInMemoryProvider(),
    },
  };
});
