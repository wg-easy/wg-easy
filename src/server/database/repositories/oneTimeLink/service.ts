import { eq, sql } from 'drizzle-orm';
import CRC32 from 'crc-32';
import { oneTimeLink } from './schema';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    delete: db
      .delete(oneTimeLink)
      .where(eq(oneTimeLink.id, sql.placeholder('id')))
      .prepare(),
    create: db
      .insert(oneTimeLink)
      .values({
        id: sql.placeholder('id'),
        oneTimeLink: sql.placeholder('oneTimeLink'),
        expiresAt: sql.placeholder('expiresAt'),
      })
      .prepare(),
    erase: db
      .update(oneTimeLink)
      .set({ expiresAt: sql.placeholder('expiresAt') as never as string })
      .where(eq(oneTimeLink.id, sql.placeholder('id')))
      .prepare(),
    findByOneTimeLink: db.query.oneTimeLink
      .findFirst({
        where: eq(oneTimeLink.oneTimeLink, sql.placeholder('oneTimeLink')),
      })
      .prepare(),
  };
}

export class OneTimeLinkService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  delete(id: ID) {
    return this.#statements.delete.execute({ id });
  }

  getByOtl(oneTimeLink: string) {
    return this.#statements.findByOneTimeLink.execute({ oneTimeLink });
  }

  generate(id: ID) {
    const key = `${id}-${Math.floor(Math.random() * 1000)}`;
    const oneTimeLink = Math.abs(CRC32.str(key)).toString(16);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return this.#statements.create.execute({ id, oneTimeLink, expiresAt });
  }

  erase(id: ID) {
    const expiresAt = new Date(Date.now() + 10 * 1000).toISOString();
    return this.#statements.erase.execute({ id, expiresAt });
  }
}
