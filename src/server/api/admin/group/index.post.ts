import { readValidatedBody } from 'h3';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { GroupCreateSchema } from '#db/repositories/group/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(GroupCreateSchema, event)
    );

    const result = await Database.groups.create(data);

    const groupId = result[0]!.groupId;
    return { success: true, groupId };
  }
);
