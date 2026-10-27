import * as vpnSettings from '#server/features/vpn/interface';
import { defineAuthenticatedEventHandler } from '#server/utils/handler';

export default defineAuthenticatedEventHandler(async ({ user }) => {
  return vpnSettings.getHooks(user);
});
