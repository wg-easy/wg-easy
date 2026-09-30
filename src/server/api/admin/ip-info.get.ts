import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { getIpInformation } from '#server/utils/ip';

export default definePermissionEventHandler('admin', 'any', async () => {
  const wgInterface = await Database.interfaces.get();
  const result = await getIpInformation(wgInterface.name);
  return result;
});
