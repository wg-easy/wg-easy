import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler('clients', 'custom', async () => {
  return Database.groups.getAll();
});
