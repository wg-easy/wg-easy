import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGetSchema } from '#db/repositories/client/types';
import { ClientQuotaAssignmentSchema } from '#db/repositories/quota/types';

export default definePermissionEventHandler(
  'quotas',
  'update',
  async ({ event }) => {
    const { clientId } = await getValidatedRouterParams(
      event,
      validateZod(ClientGetSchema, event)
    );
    const { quotaId } = await readValidatedBody(
      event,
      validateZod(ClientQuotaAssignmentSchema, event)
    );
    await WireGuard.runConfigMutation(async () => {
      const result = await Database.quotas.assignClient(clientId, quotaId);
      if (result === 'quota-not-found') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Quota not found',
        });
      }
      if (result === 'client-not-found') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Client not found',
        });
      }
    });
    return { success: true };
  }
);
