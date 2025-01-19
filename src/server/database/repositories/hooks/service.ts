import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { hooks } from './schema';
import type { HooksUpdateType } from './types';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.hooks
      .findFirst({ where: eq(hooks.id, sql.placeholder('interface')) })
      .prepare(),
  };
}

export class HooksService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  get(infName: string) {
    return this.#statements.get.execute({ interface: infName });
  }

  update(infName: string, data: HooksUpdateType) {
    return this.#db
      .update(hooks)
      .set(data)
      .where(eq(hooks.id, infName))
      .execute();
  }
}
