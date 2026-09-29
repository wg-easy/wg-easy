import { requestedInterface } from '#server/utils/protocol';
import WireGuard from '#server/utils/WireGuard';
import { definePermissionEventHandler } from '#server/utils/handler';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    await WireGuard.Restart(requestedInterface(event));

    return { success: true };
  }
);
