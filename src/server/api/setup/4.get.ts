import { defineSetupEventHandler } from '#server/utils/handler';
import { cachedGetIpInformation } from '#server/utils/ip';

export default defineSetupEventHandler(4, async () => {
  const result = await cachedGetIpInformation();
  return result;
});
