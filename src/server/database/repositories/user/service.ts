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
    findByUsername: db.query.user
      .findFirst({
        where: eq(user.username, sql.placeholder('username')),
      })
      .prepare(),
  };
}

export class UserService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  async getAll() {
    return this.#statements.findAll.execute();
  }

  async get(id: ID) {
    return this.#statements.findById.execute({ id });
  }

  async getByUsername(username: string) {
    return this.#statements.findByUsername.execute({ username });
  }

  async create(username: string, password: string) {
    const hash = await hashPassword(password);

    return this.#db.transaction(async (tx) => {
      const oldUser = await this.getByUsername(username);

      if (oldUser) {
        throw new Error('User already exists');
      }

      const userCount = await tx.$count(user);

      await tx.insert(user).values({
        password: hash,
        username,
        email: null,
        name: 'Administrator',
        role: userCount === 0 ? roles.ADMIN : roles.CLIENT,
        enabled: true,
      });
    });
  }
}
