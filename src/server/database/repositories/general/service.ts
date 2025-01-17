import type { DBType } from '#db/sqlite';
import { sql } from 'drizzle-orm';
import { general } from './schema';

function createPreparedStatement(db: DBType) {
  return {
    find: db.query.general.findFirst().prepare(),
    updateSetupStep: db
      .update(general)
      .set({
        setupStep: sql.placeholder('setupStep') as never as number,
      })
      .prepare(),
  };
}

export class GeneralService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  /**
   * @throws
   */
  private async get() {
    const result = await this.#statements.find.execute();
    if (!result) {
      throw new Error('General Config not found');
    }
    return result;
  }

  /**
   * @throws
   */
  async getSetupStep() {
    const result = await this.get();
    return { step: result.setupStep, done: result.setupStep === 0 };
  }

  setSetupStep(step: number) {
    return this.#statements.updateSetupStep.execute({ setupStep: step });
  }

  /**
   * @throws
   */
  async getSessionConfig() {
    const result = await this.get();
    return {
      sessionPassword: result.sessionPassword,
      sessionTimeout: result.sessionTimeout,
    };
  }
}
