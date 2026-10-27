import { createError, readValidatedBody } from 'h3';

import { ClientBulkSchema } from '#db/repositories/client/types';
import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { hasPermissionsWithData } from '#shared/utils/permissions';

export default definePermissionEventHandler(
  'clients',
  'custom',
  async ({ event, user }) => {
    const body = await readValidatedBody(
      event,
      validateZod(ClientBulkSchema, event)
    );
    const permission = hasPermissionsWithData(
      user,
      'clients',
      body.action === 'delete' ? 'delete' : 'update'
    );

    const count = await Database.clients.bulkAction(body, (clients) => {
      for (const client of clients) permission.check(client);
      if (clients.length !== body.clientIds.length) {
        throw createError({
          statusCode: 404,
          message:
            'Some selected clients no longer exist. Refresh and try again.',
        });
      }
      if (
        body.action === 'enable' &&
        clients.some(
          (client) =>
            client.expiresAt !== null &&
            Date.now() > new Date(client.expiresAt).getTime()
        )
      ) {
        throw createError({
          statusCode: 422,
          message:
            'Some selected clients are expired. Update their expiration dates before enabling them.',
        });
      }
    });

    await WireGuard.saveConfig();
    return { success: true, count };
  }
);
