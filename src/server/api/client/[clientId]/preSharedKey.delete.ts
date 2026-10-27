import { getValidatedRouterParams } from 'h3';

import clientMutations from '#server/utils/clientMutations';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    await clientMutations.apply(user, clientId, 'removePreSharedKey');
    return { success: true };
  }
);
