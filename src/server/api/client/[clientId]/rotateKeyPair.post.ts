import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGetSchema } from '#db/repositories/client/types';

export default definePermissionEventHandler(
  'clients',
  'update',
  async ({ event, checkPermissions }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );

    const client = await Database.clients.getPublic(clientId);
    checkPermissions(client);
    if (!client) {
      throw createError({ statusCode: 404, statusMessage: 'Client not found' });
    }

    await Database.clients.rotateKeyPair(clientId);
    await WireGuard.saveConfig();

    return { success: true };
  }
);
