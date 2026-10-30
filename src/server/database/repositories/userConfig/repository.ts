import { eq } from 'drizzle-orm';

import { userConfig } from './schema';

import type { DBExecutor } from '#db/types';

export class UserConfigRepository {
  constructor(
    private readonly db: DBExecutor,
    private readonly interfaceName: string
  ) {}

  async get() {
    const result = await this.db.query.userConfig.findFirst({
      where: eq(userConfig.id, this.interfaceName),
    });
    if (!result) {
      throw new Error('User config not found');
    }
    return result;
  }

  async update(data: Partial<typeof userConfig.$inferInsert>) {
    return this.db
      .update(userConfig)
      .set(data)
      .where(eq(userConfig.id, this.interfaceName));
  }
}
