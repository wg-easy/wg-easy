import { getValidatedRouterParams, readValidatedBody } from 'h3';

import clientMutations from '#server/utils/clientMutations';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import {
  ClientGetSchema,
  ClientUpdateSchema,
} from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const data = await readValidatedBody(
      event,
      validateZod(ClientUpdateSchema, event)
    );

    await clientMutations.update(user, clientId, data);

    return { success: true };
  }
);
