import type { DBType } from '#db/sqlite';
import { eq, sql } from 'drizzle-orm';
import { prometheus } from './schema';

function createPreparedStatement(db: DBType) {
  return {
    get: db.query.prometheus
      .findFirst({ where: eq(prometheus.id, sql.placeholder('interface')) })
      .prepare(),
  };
}

export class PrometheusService {
  #statements: ReturnType<typeof createPreparedStatement>;

  constructor(db: DBType) {
    this.#statements = createPreparedStatement(db);
  }

  get(infName: string) {
    return this.#statements.get.execute({ interface: infName });
  }
}

export class MetricsService {
  prometheus: PrometheusService;

  constructor(db: DBType) {
    this.prometheus = new PrometheusService(db);
  }
}
