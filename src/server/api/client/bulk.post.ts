import { readValidatedBody } from 'h3';

import { ClientBulkSchema } from '#db/repositories/client/types';
import clientMutations from '#server/utils/clientMutations';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const body = await readValidatedBody(
      event,
      validateZod(ClientBulkSchema, event)
    );

    const count = await clientMutations.bulk(user, body);
    return { success: true, count };
  }
);
