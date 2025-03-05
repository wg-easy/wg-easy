import { eq, sql } from 'drizzle-orm';
import { hooks } from './schema';
import type { HooksUpdateType } from './types';
import type { DBType } from '#db/sqlite';

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

  async get() {
    const hooks = await this.#statements.get.execute({ interface: 'wg0' });
    if (!hooks) {
      throw new Error('Hooks not found');
    }
    return hooks;
  }

  update(data: HooksUpdateType) {
    return this.#db
      .update(hooks)
      .set(data)
      .where(eq(hooks.id, 'wg0'))
      .execute();
  }
}
