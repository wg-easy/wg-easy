import { readValidatedBody } from 'h3';

import { ClientBulkSchema } from '#shared/contracts/client';
import * as clients from '#server/features/vpn/clients';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const body = await readValidatedBody(
    event,
    validateZod(ClientBulkSchema, event)
  );

  const count = await clients.bulk(user, body);
  return { success: true, count };
});
