import type { Undefined } from '../database';
import type System from '../entities/system';

/**
 * Abstract class for system-related database operations.
 * This class provides a method for retrieving system configuration data from the database.
 */
export default abstract class SystemRepository {
  /**
   * Retrieves system data from the database.
   * @returns {Promise<System | Undefined>} The system data or null if not found.
   */
  abstract getSystem(): Promise<System | Undefined>;
}
