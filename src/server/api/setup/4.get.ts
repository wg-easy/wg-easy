import * as setupSteps from '#server/features/setup';
import { defineSetupEventHandler } from '#server/utils/handler';

export default defineSetupEventHandler(4, async () => {
  return setupSteps.ipInformation();
});
