import type { InMemory } from '~/adapters/database/inmemory';

export default (): InMemory => {
  return useNuxtApp().$database;
};
