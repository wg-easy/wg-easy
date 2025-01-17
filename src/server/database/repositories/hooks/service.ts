import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { hooks } from './schema';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.hooks
      .findFirst({ where: eq(hooks.id, sql.placeholder('interface')) })
      .prepare(),
  };
}

export class HooksService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  get(wgInterface: string) {
    return this.#statements.get.execute({ interface: wgInterface });
  }
}
