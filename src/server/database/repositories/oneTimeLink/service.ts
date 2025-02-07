import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { oneTimeLink } from './schema';
import type { ID } from '../../schema';
import CRC32 from 'crc-32';

function createPreparedStatement(db: DBType) {
  return {
    delete: db
      .delete(oneTimeLink)
      .where(eq(oneTimeLink.id, sql.placeholder('id')))
      .prepare(),
    create: db
      .insert(oneTimeLink)
      .values({
        clientId: sql.placeholder('id'),
        oneTimeLink: sql.placeholder('oneTimeLink'),
        expiresAt: sql.placeholder('expiresAt'),
      })
      .prepare(),
    erase: db
      .update(oneTimeLink)
      .set({ expiresAt: sql.placeholder('expiresAt') as never as string })
      .where(eq(oneTimeLink.clientId, sql.placeholder('id')))
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

  generate(id: ID) {
    const key = `${id}-${Math.floor(Math.random() * 1000)}`;
    const oneTimeLink = Math.abs(CRC32.str(key)).toString(16);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return this.#statements.create.execute({ id, oneTimeLink, expiresAt });
  }

  erase(id: ID) {
    const expiresAt = Date.now() + 10 * 1000;
    return this.#statements.erase.execute({ id, expiresAt });
  }
}
