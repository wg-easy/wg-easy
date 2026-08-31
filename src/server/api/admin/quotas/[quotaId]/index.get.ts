import { createError, getValidatedRouterParams } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { QuotaIdSchema } from '#db/repositories/quota/types';

export default definePermissionEventHandler(
  'quotas',
  'view',
  async ({ event }) => {
    const { quotaId } = await getValidatedRouterParams(
      event,
      validateZod(QuotaIdSchema, event)
    );
    const result = await Database.quotas.get(quotaId);
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Quota not found' });
    }
    return result;
  }
);
