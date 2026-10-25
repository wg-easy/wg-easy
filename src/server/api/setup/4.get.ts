import Database from '#server/utils/Database';
import { defineSetupEventHandler } from '#server/utils/handler';
import { getIpInformation } from '#server/utils/ip';

export default defineSetupEventHandler(4, async () => {
  const wgInterface = await Database.interfaces.get();
  const result = await getIpInformation(wgInterface.name);
  return result;
});
