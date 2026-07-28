import { createError, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientBulkToggleSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'update',
  async ({ event, checkPermissions }) => {
    const { clientIds, enabled } = await readValidatedBody(
      event,
      validateZod(ClientBulkToggleSchema, event)
    );
    const clients = await Promise.all(
      clientIds.map((clientId) => Database.clients.get(clientId))
    );

    if (clients.some((client) => !client)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    for (const client of clients as NonNullable<(typeof clients)[number]>[]) {
      checkPermissions(client);

      if (
        enabled &&
        client.expiresAt &&
        new Date() > new Date(client.expiresAt)
      ) {
        throw createError({
          statusCode: 422,
          statusMessage:
            'Client is expired. Please update the expiration date first.',
          message: 'Client is expired. Please update the expiration date first.',
        });
      }
    }

    await Database.clients.toggleMany(clientIds, enabled);
    await WireGuard.saveConfig();

    return { success: true };
  }
);
