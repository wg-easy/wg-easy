import { ClientRepository } from './repositories/client/repository';
import { InterfaceRepository } from './repositories/interface/repository';
import { HooksRepository } from './repositories/hooks/repository';
import { UserConfigRepository } from './repositories/userConfig/repository';
import { OneTimeLinkRepository } from './repositories/oneTimeLink/repository';
import { UserRepository } from './repositories/user/repository';
import { GeneralRepository } from './repositories/general/repository';
import type { DBExecutor, DBType } from './types';

function repositories(db: DBExecutor, interfaceName: string) {
  return {
    clients: new ClientRepository(db),
    interfaces: new InterfaceRepository(db, interfaceName),
    hooks: new HooksRepository(db, interfaceName),
    userConfigs: new UserConfigRepository(db, interfaceName),
    oneTimeLinks: new OneTimeLinkRepository(db),
    users: new UserRepository(db),
    general: new GeneralRepository(db),
  };
}

export type Repositories = ReturnType<typeof repositories>;

/** One executor is shared by every repository participating in an operation. */
export function createStore(db: DBType, interfaceName: string) {
  return {
    ...repositories(db, interfaceName),
    transaction<T>(operation: (repositories: Repositories) => Promise<T>) {
      return db.transaction((tx) => operation(repositories(tx, interfaceName)));
    },
  };
}

export type DatabaseStore = ReturnType<typeof createStore>;
