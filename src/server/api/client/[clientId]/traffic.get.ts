import { createError, getValidatedQuery, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGetSchema } from '#db/repositories/client/types';
import { TrafficQuerySchema } from '#db/repositories/traffic/types';
import type { TrafficReport } from '#db/repositories/traffic/types';

export default definePermissionEventHandler(
  'clients',
  'view',
  async ({ event, checkPermissions }): Promise<TrafficReport> => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const query = await getValidatedQuery(
      event,
      validateZod(TrafficQuerySchema, event)
    );

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    return Database.traffic.getReport(client, query);
  }
);
