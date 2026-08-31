import { createError, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { QuotaCreateSchema } from '#db/repositories/quota/types';
import { QuotaClientNotFoundError } from '#db/repositories/quota/service';

export default definePermissionEventHandler(
  'quotas',
  'create',
  async ({ event }) => {
    const input = await readValidatedBody(
      event,
      validateZod(QuotaCreateSchema, event)
    );
    try {
      const quotaId = await WireGuard.runConfigMutation(() =>
        Database.quotas.create(input)
      );
      return { success: true, quotaId };
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
