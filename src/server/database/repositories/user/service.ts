import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { user } from './schema';
import type { ID } from '../../schema';

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.user.findMany().prepare(),
    findById: db.query.user
      .findFirst({ where: eq(user.id, sql.placeholder('id')) })
      .prepare(),
  };
}

export class UserService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  async getAll() {
    return this.#statements.findAll.all();
  }

  async get(id: ID) {
    return this.#statements.findById.all({ id });
  }
}
