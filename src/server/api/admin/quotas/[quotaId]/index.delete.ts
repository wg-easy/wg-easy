import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { QuotaIdSchema } from '#db/repositories/quota/types';

export default definePermissionEventHandler(
  'quotas',
  'delete',
  async ({ event }) => {
    const { quotaId } = await getValidatedRouterParams(
      event,
      validateZod(QuotaIdSchema, event)
    );
    await WireGuard.runConfigMutation(async () => {
      if (!(await Database.quotas.delete(quotaId))) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Quota not found',
        });
      }
    });
    return { success: true };
  }
);
