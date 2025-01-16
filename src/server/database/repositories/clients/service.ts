import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { clients } from './schema';

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.clients
      .findMany({
        with: {
          oneTimeLink: true,
        },
      })
      .prepare(),
    findById: db.query.clients
      .findFirst({ where: eq(clients.id, sql.placeholder('id')) })
      .prepare(),
  };
}

export class ClientsService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  async findAll() {
    const result = await this.#statements.findAll.all();
    return result.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async findById(id: number) {
    return this.#statements.findById.all({ id });
  }
}
