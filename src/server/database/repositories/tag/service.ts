import { eq, ne, sql, and } from 'drizzle-orm';

import { tag } from './schema';
import type { TagCreateType, TagUpdateType } from './types';

import type { ID } from '#server/utils/types';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.tag
      .findMany({ orderBy: (t, { asc }) => asc(t.name) })
      .prepare(),
    findById: db.query.tag
      .findFirst({ where: eq(tag.id, sql.placeholder('id')) })
      .prepare(),
    delete: db.delete(tag).where(eq(tag.id, sql.placeholder('id'))).prepare(),
  };
}

export class TagService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  getAll() {
    return this.#statements.findAll.execute();
  }

  get(id: ID) {
    return this.#statements.findById.execute({ id });
  }

  create({ name, description }: TagCreateType) {
    return this.#db.transaction(async (tx) => {
      const existing = await tx.query.tag
        .findFirst({ where: eq(tag.name, name) })
        .execute();

      if (existing) {
        throw new Error('Tag with this name already exists');
      }

      return await tx
        .insert(tag)
        .values({ name, description })
        .returning({ id: tag.id })
        .execute();
    });
  }

  update(id: ID, { name, description }: TagUpdateType) {
    return this.#db.transaction(async (tx) => {
      const existing = await tx.query.tag
        .findFirst({ where: and(eq(tag.name, name), ne(tag.id, id)) })
        .execute();

      if (existing) {
        throw new Error('Tag with this name already exists');
      }

      await tx
        .update(tag)
        .set({ name, description })
        .where(eq(tag.id, id))
        .execute();
    });
  }

  delete(id: ID) {
    return this.#statements.delete.execute({ id });
  }
}
