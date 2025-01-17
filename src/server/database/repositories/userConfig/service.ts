import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { userConfig } from './schema';

function createPreparedStatement(db: DBType) {
  return {
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
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  async updateHostPort(wgInterface: string, host: string, port: number) {
    return await this.#statements.updateHostPort.execute({
      interface: wgInterface,
      host,
      port,
    });
  }
}
