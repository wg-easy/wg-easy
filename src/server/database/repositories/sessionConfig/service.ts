import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    find: db.query.sessionConfig.findFirst().prepare(),
  };
}

export class SessionConfigService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  /**
   * @throws
   */
  async get() {
    const result = await this.#statements.find.all();
    if (!result) {
      throw new Error('Session Config not found');
    }
    return result;
  }
}
