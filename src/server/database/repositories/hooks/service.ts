import { eq, sql } from 'drizzle-orm';

import { hooks } from './schema';
import type { HooksUpdateType } from './types';

import { WG_ENV } from '#server/utils/config';
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

  async get(interfaceName = WG_ENV.WG_INTERFACE) {
    const hooks = await this.#statements.get.execute({
      interface: interfaceName,
    });
    if (!hooks) {
      throw new Error('Hooks not found');
    }
    return hooks;
  }

  update(data: HooksUpdateType, interfaceName = WG_ENV.WG_INTERFACE) {
    return this.#db
      .update(hooks)
      .set(data)
      .where(eq(hooks.id, interfaceName))
      .execute();
  }
}
