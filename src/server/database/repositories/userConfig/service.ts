import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { userConfig } from './schema';
import type { UserConfigUpdateType } from './types';

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

  get(infName: string) {
    return this.#statements.get.execute({ interface: infName });
  }

  updateHostPort(infName: string, host: string, port: number) {
    return this.#statements.updateHostPort.execute({
      interface: infName,
      host,
      port,
    });
  }

  update(infName: string, data: UserConfigUpdateType) {
    return this.#db
      .update(userConfig)
      .set(data)
      .where(eq(userConfig.id, infName))
      .execute();
  }
}
