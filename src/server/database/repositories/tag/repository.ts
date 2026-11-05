import { and, eq, ne } from 'drizzle-orm';

import { clientTag, tag } from './schema';

import type { DBExecutor } from '#db/types';

export class TagRepository {
  constructor(private readonly db: DBExecutor) {}

  async getAll() {
    return this.db.query.tag.findMany({
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async get(id: number) {
    return this.db.query.tag.findFirst({ where: eq(tag.id, id) });
  }

  /** Finds a tag with this name, optionally ignoring the tag being renamed. */
  async findByName(name: string, excludeId?: number) {
    return this.db.query.tag.findFirst({
      where: and(
        eq(tag.name, name),
        excludeId === undefined ? undefined : ne(tag.id, excludeId)
      ),
    });
  }

  async insert(data: typeof tag.$inferInsert) {
    return this.db.insert(tag).values(data).returning({ id: tag.id });
  }

  async update(id: number, data: Partial<typeof tag.$inferInsert>) {
    return this.db.update(tag).set(data).where(eq(tag.id, id));
  }

  async delete(id: number) {
    return this.db.delete(tag).where(eq(tag.id, id));
  }

  /** Replaces every tag assigned to the client. */
  async setClientTags(clientId: number, tagIds: number[]) {
    await this.db.delete(clientTag).where(eq(clientTag.clientId, clientId));
    if (tagIds.length > 0) {
      await this.db
        .insert(clientTag)
        .values(tagIds.map((tagId) => ({ clientId, tagId })));
    }
  }
}
