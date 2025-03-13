import { eq, sql } from 'drizzle-orm';
import { userConfig } from './schema';
import type { UserConfigUpdateType } from './types';
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

  async get() {
    const userConfig = await this.#statements.get.execute({ interface: 'wg0' });

    if (!userConfig) {
      throw new Error('User config not found');
    }

    return userConfig;
  }

  // TODO: wrap ipv6 host in square brackets

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
        .where(eq(userConfig.id, 'wg0'))
        .execute();

      await tx
        .update(wgInterface)
        .set({ port })
        .where(eq(wgInterface.name, 'wg0'))
        .execute();
    });
  }

  update(data: UserConfigUpdateType) {
    return this.#db
      .update(userConfig)
      .set(data)
      .where(eq(userConfig.id, 'wg0'))
      .execute();
  }
}
