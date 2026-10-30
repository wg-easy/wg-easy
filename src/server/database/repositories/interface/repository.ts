import { eq } from 'drizzle-orm';

import { wgInterface } from './schema';

import type { DBExecutor } from '#db/types';

export class InterfaceRepository {
  constructor(
    private readonly db: DBExecutor,
    private readonly interfaceName: string
  ) {}

  async get() {
    const result = await this.db.query.wgInterface.findFirst({
      where: eq(wgInterface.name, this.interfaceName),
    });
    if (!result) {
      throw new Error('Interface not found');
    }
    return result;
  }

  async update(data: Partial<typeof wgInterface.$inferInsert>) {
    return this.db
      .update(wgInterface)
      .set(data)
      .where(eq(wgInterface.name, this.interfaceName));
  }
}
