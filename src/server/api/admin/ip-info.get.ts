import { definePermissionEventHandler } from '#server/utils/handler';
import { cachedGetIpInformation } from '#server/utils/ip';

export default definePermissionEventHandler('admin', 'any', async () => {
  const result = await cachedGetIpInformation();
  return result;
});
