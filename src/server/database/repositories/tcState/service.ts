import { sql, eq } from 'drizzle-orm';

import { tcState } from './schema';
import type { TcClass } from './schema';
import type { DBType } from '#db/sqlite';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.tcState
      .findFirst({ where: eq(tcState.id, 1) })
      .prepare(),
  };
}

export class TcStateService {
  #db: DBType;
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#db = db;
    this.#statements = createPreparedStatement(db);
  }

  async get(): Promise<{
    totalUlRate: number;
    defaultClassId: number;
    classes: TcClass[];
  }> {
    let state = await this.#statements.get.execute();
    if (!state) {
      // First run: create default state with empty classes and default class 1:21 (2{ulRate} convention: ulRate=1)
      await this.#db.insert(tcState).values({
        id: 1,
        totalUlRate: 100,
        defaultClassId: 21, // 2{ulRate} convention: 21 means ulRate=1
        classes: [],
      }).execute();
      state = await this.#statements.get.execute();
      if (!state) {
        throw new Error('Failed to create TC state');
      }
    }
    return {
      totalUlRate: state.totalUlRate,
      defaultClassId: state.defaultClassId,
      classes: state.classes as TcClass[],
    };
  }

  async update(data: {
    totalUlRate: number;
    defaultClassId: number;
    classes: TcClass[];
  }) {
    // Classes are sorted by ulRate ascending
    const sortedClasses = [...data.classes].sort((a, b) => a.ulRate - b.ulRate);

    await this.#db
      .insert(tcState)
      .values({
        id: 1,
        totalUlRate: data.totalUlRate,
        defaultClassId: data.defaultClassId,
        classes: sortedClasses,
      })
      .onConflictDoUpdate({
        target: tcState.id,
        set: {
          totalUlRate: data.totalUlRate,
          defaultClassId: data.defaultClassId,
          classes: sortedClasses,
        },
      })
      .execute();
  }
}