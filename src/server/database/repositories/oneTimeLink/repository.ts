import { eq } from 'drizzle-orm';

import { oneTimeLink } from './schema';

import type { DBExecutor } from '#db/types';

export class OneTimeLinkRepository {
  constructor(private readonly db: DBExecutor) {}

  async delete(id: number) {
    return this.db.delete(oneTimeLink).where(eq(oneTimeLink.id, id));
  }

  async getByToken(token: string) {
    return this.db.query.oneTimeLink.findFirst({
      where: eq(oneTimeLink.oneTimeLink, token),
    });
  }

  async save(id: number, token: string, expiresAt: string) {
    return this.db
      .insert(oneTimeLink)
      .values({ id, oneTimeLink: token, expiresAt })
      .onConflictDoUpdate({
        target: oneTimeLink.id,
        // Reissuing a link extends its lifetime without changing its token.
        set: { expiresAt },
      });
  }

  async setExpiry(id: number, expiresAt: string) {
    return this.db
      .update(oneTimeLink)
      .set({ expiresAt })
      .where(eq(oneTimeLink.id, id));
  }
}
