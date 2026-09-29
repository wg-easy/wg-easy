import { eq, sql } from 'drizzle-orm';

import { userConfig } from './schema';
import type { UserConfigUpdateType } from './types';

import { WG_ENV } from '#server/utils/config';
import { wgInterface } from '#db/schema';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.userConfig
      .findFirst({ where: eq(userConfig.id, sql.placeholder('interface')) })
      .prepare(),
  };
}

export class UserConfigService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  async get(interfaceName = WG_ENV.WG_INTERFACE) {
    const userConfig = await this.#statements.get.execute({
      interface: interfaceName,
    });

    if (!userConfig) {
      throw new Error('User config not found');
    }

    if (!userConfig.host && interfaceName !== WG_ENV.WG_INTERFACE) {
      userConfig.host = (await this.get()).host;
    }
    return userConfig;
  }

  /**
   * sets host of user config
   *
   * sets port of user config and interface
   */
  updateHostPort(host: string, port: number) {
    return this.#db.transaction(async (tx) => {
      await tx
        .update(userConfig)
        .set({ host, port })
        .where(eq(userConfig.id, WG_ENV.WG_INTERFACE))
        .execute();

      await tx
        .update(wgInterface)
        .set({ port })
        .where(eq(wgInterface.name, WG_ENV.WG_INTERFACE))
        .execute();
    });
  }

  update(
    data: Partial<UserConfigUpdateType>,
    interfaceName = WG_ENV.WG_INTERFACE
  ) {
    return this.#db
      .update(userConfig)
      .set(data)
      .where(eq(userConfig.id, interfaceName))
      .execute();
  }
}
