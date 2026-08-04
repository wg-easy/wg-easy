import { createError, readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { ClientGroupCreateSchema } from '#db/repositories/clientGroup/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(ClientGroupCreateSchema, event)
    );

    try {
      const group = await Database.clientGroups.create(data);
      return { success: true, group };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Client group already exists'
      ) {
        throw createError({
          statusCode: 409,
          statusMessage: error.message,
        });
      }

      throw error;
    }
  }
);
