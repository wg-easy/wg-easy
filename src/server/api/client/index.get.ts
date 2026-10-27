import { getValidatedQuery } from 'h3';

import * as clientQueries from '#server/features/vpn/queries';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/http/validation';
import { ClientQuerySchema } from '#shared/contracts/client';

export default defineAuthenticatedEventHandler(async ({ event, user }) => {
  const query = await getValidatedQuery(
    event,
    validateZod(ClientQuerySchema, event)
  );

  return clientQueries.list(user, query);
});
