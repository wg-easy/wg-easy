import { general } from './schema';

import type { DBExecutor } from '#db/types';

export class GeneralRepository {
  constructor(private readonly db: DBExecutor) {}

  private async get() {
    const result = await this.db.query.general.findFirst();
    if (!result) {
      throw new Error('General Config not found');
    }
    return result;
  }

  async getSetupStep() {
    const { setupStep } = await this.get();
    return { step: setupStep, done: setupStep === 0 };
  }

  async getSessionConfig() {
    const { sessionPassword, sessionTimeout } = await this.get();
    return { sessionPassword, sessionTimeout };
  }

  async getMetricsConfig() {
    const { metricsPrometheus, metricsJson, metricsPassword } =
      await this.get();
    return {
      prometheus: metricsPrometheus,
      json: metricsJson,
      password: metricsPassword,
    };
  }

  async getConfig() {
    const { sessionTimeout, metricsPrometheus, metricsJson, metricsPassword } =
      await this.get();
    return { sessionTimeout, metricsPrometheus, metricsJson, metricsPassword };
  }

  async update(data: Partial<typeof general.$inferInsert>) {
    return this.db.update(general).set(data);
  }
}
