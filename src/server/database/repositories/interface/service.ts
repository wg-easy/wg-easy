import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { wgInterface } from './schema';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.wgInterface
      .findFirst({ where: eq(wgInterface.name, sql.placeholder('interface')) })
      .prepare(),
    getAll: db.query.wgInterface.findMany().prepare(),
    updateKeyPair: db
      .update(wgInterface)
      .set({
        privateKey: sql.placeholder('privateKey') as never as string,
        publicKey: sql.placeholder('publicKey') as never as string,
      })
      .where(eq(wgInterface.name, sql.placeholder('interface')))
      .prepare(),
  };
}

export class InterfaceService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  get(infName: string) {
    return this.#statements.get.execute({ interface: infName });
  }

  getAll() {
    return this.#statements.getAll.execute();
  }

  updateKeyPair(infName: string, privateKey: string, publicKey: string) {
    return this.#statements.updateKeyPair.execute({
      interface: infName,
      privateKey,
      publicKey,
    });
  }
}
