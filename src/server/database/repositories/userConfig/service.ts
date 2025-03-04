import { eq, sql } from 'drizzle-orm';
import { userConfig } from './schema';
import type { UserConfigUpdateType } from './types';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.userConfig
      .findFirst({ where: eq(userConfig.id, sql.placeholder('interface')) })
      .prepare(),
    updateHostPort: db
      .update(userConfig)
      .set({
        host: sql.placeholder('host') as never as string,
        port: sql.placeholder('port') as never as number,
      })
      .where(eq(userConfig.id, sql.placeholder('interface')))
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

  updateHostPort(host: string, port: number) {
    return this.#statements.updateHostPort.execute({
      interface: 'wg0',
      host,
      port,
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
