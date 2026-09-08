import { createError, getValidatedRouterParams, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { QuotaIdSchema, QuotaUpdateSchema } from '#db/repositories/quota/types';
import { QuotaClientNotFoundError } from '#db/repositories/quota/service';

export default definePermissionEventHandler(
  'quotas',
  'update',
  async ({ event }) => {
    const { quotaId } = await getValidatedRouterParams(
      event,
      validateZod(QuotaIdSchema, event)
    );
    const input = await readValidatedBody(
      event,
      validateZod(QuotaUpdateSchema, event)
    );
    try {
      await WireGuard.runConfigMutation(async () => {
        if (!(await Database.quotas.update(quotaId, input))) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Quota not found',
          });
        }
      });
      return { success: true };
    } catch (error) {
      if (error instanceof QuotaClientNotFoundError) {
        throw createError({
          statusCode: 404,
          statusMessage: error.message,
        });
      }
      if (error instanceof Error && error.message.includes('UNIQUE')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'A quota with this name already exists',
        });
      }
      throw error;
    }
  }
);
