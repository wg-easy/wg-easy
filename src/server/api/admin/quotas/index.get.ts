import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler('quotas', 'view', async () => {
  return Database.quotas.getAll();
});
