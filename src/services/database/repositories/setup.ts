export type Steps = 1 | 2 | 3 | 4 | 5 | 'success';

/**
 * Interface for setup-related database operations.
 * This interface provides methods for managing setup data.
 */
export abstract class SetupRepository {
  abstract done(): Promise<boolean>;
  abstract get(): Promise<Steps>;
  abstract set(step: Steps): Promise<void>;
}
