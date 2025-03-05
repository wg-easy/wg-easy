import { eq, sql } from 'drizzle-orm';
import { user } from './schema';
import type { DBType } from '#db/sqlite';

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
    update: db
      .update(user)
      .set({
        name: sql.placeholder('name') as never as string,
        email: sql.placeholder('email') as never as string,
      })
      .where(eq(user.id, sql.placeholder('id')))
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
      const oldUser = await tx.query.user
        .findFirst({
          where: eq(user.username, username),
        })
        .execute();

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

  async update(id: ID, name: string, email: string | null) {
    return this.#statements.update.execute({ id, name, email });
  }

  async updatePassword(id: ID, currentPassword: string, newPassword: string) {
    const hash = await hashPassword(newPassword);

    return this.#db.transaction(async (tx) => {
      // get user again to avoid password changing while request
      const txUser = await tx.query.user
        .findFirst({ where: eq(user.id, id) })
        .execute();

      if (!txUser) {
        throw new Error('User not found');
      }

      const passwordValid = await isPasswordValid(
        currentPassword,
        txUser.password
      );

      if (!passwordValid) {
        throw new Error('Invalid password');
      }

      await tx
        .update(user)
        .set({ password: hash })
        .where(eq(user.id, id))
        .execute();
    });
  }
}
