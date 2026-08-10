import { eq, sql } from 'drizzle-orm';

import { group } from './schema';
import type { GroupCreateType, GroupUpdateType } from './types';

import type { ID } from '#server/utils/types';
import type { DBType } from '#db/sqlite';
import { client } from '#db/schema';

function createPreparedStatement(db: DBType) {
  return {
    findAll: db.query.group
      .findMany({
        orderBy: (grp, { asc }) => asc(grp.name),
      })
      .prepare(),
    findById: db.query.group
      .findFirst({ where: eq(group.id, sql.placeholder('id')) })
      .prepare(),
  };
}

export class GroupService {
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

  create(data: GroupCreateType) {
    return this.#db
      .insert(group)
      .values(data)
      .returning({ groupId: group.id })
      .execute();
  }

  update(id: ID, data: GroupUpdateType) {
    return this.#db.update(group).set(data).where(eq(group.id, id)).execute();
  }

  delete(id: ID) {
    return this.#db.transaction(async (tx) => {
      // Detach clients from the group before removing it so we never
      // violate the foreign key reference on clients_table.
      await tx
        .update(client)
        .set({ groupId: null })
        .where(eq(client.groupId, id))
        .execute();

      await tx.delete(group).where(eq(group.id, id)).execute();
    });
  }
}
