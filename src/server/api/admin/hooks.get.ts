import { requestedInterface } from '#server/utils/protocol';
import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const hooks = await Database.hooks.get(requestedInterface(event));
    return hooks;
  }
);
