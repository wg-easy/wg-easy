import { readValidatedBody } from 'h3';

import clientMutations from '#server/utils/clientMutations';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientCreateSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const { name, expiresAt } = await readValidatedBody(
      event,
      validateZod(ClientCreateSchema, event)
    );

    const clientId = await clientMutations.create(user, { name, expiresAt });
    return { success: true, clientId };
  }
);
