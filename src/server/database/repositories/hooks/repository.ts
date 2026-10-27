import { eq } from 'drizzle-orm';

import { hooks } from './schema';

import type { DBExecutor } from '#db/types';

export class HooksRepository {
  constructor(
    private readonly db: DBExecutor,
    private readonly interfaceName: string
  ) {}

  async get() {
    const result = await this.db.query.hooks.findFirst({
      where: eq(hooks.id, this.interfaceName),
    });
    if (!result) {
      throw new Error('Hooks not found');
    }
    return result;
  }

  async update(data: Partial<typeof hooks.$inferInsert>) {
    return this.db
      .update(hooks)
      .set(data)
      .where(eq(hooks.id, this.interfaceName));
  }
}
