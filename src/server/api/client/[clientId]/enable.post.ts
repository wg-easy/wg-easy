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

    const client = await Database.clients.get(clientId);
    checkPermissions(client);

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Client not found',
      });
    }

    if (client.expiresAt !== null && new Date() > new Date(client.expiresAt)) {
      throw createError({
        statusCode: 422,
        statusMessage:
          'Client is expired. Please update the expiration date first.',
        message: 'Client is expired. Please update the expiration date first.',
      });
    }

    await WireGuard.updateTrafficStats();
    const exceededQuotas = await Database.traffic.getExceededQuotas(clientId);
    if (exceededQuotas.length > 0) {
      const periods = exceededQuotas.join(', ');
      throw createError({
        statusCode: 422,
        statusMessage: `Client traffic quota exceeded: ${periods}`,
        message: `Client traffic quota exceeded: ${periods}`,
      });
    }

    await Database.clients.toggle(clientId, true);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
