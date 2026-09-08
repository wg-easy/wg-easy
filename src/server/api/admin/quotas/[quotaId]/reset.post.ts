import { createError, getValidatedRouterParams } from 'h3';

import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { QuotaIdSchema } from '#db/repositories/quota/types';

export default definePermissionEventHandler(
  'quotas',
  'update',
  async ({ event }) => {
    const { quotaId } = await getValidatedRouterParams(
      event,
      validateZod(QuotaIdSchema, event)
    );
    if (!(await WireGuard.resetQuota(quotaId))) {
      throw createError({ statusCode: 404, statusMessage: 'Quota not found' });
    }
    return { success: true };
  }
);
