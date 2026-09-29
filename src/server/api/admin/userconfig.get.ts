import { requestedInterface } from '#server/utils/protocol';
import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const userConfig = await Database.userConfigs.get(
      requestedInterface(event)
    );
    return userConfig;
  }
);
