import { GeneralUpdateSchema } from '#db/repositories/general/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(GeneralUpdateSchema, event)
    );

    // Get current settings to check if bandwidth changed
    const current = await Database.general.getConfig();
    const bandwidthChanged =
      current.bandwidthEnabled !== data.bandwidthEnabled ||
      current.downloadLimitMbps !== data.downloadLimitMbps ||
      current.uploadLimitMbps !== data.uploadLimitMbps;

    await Database.general.update(data);
    await WireGuard.saveConfig();

    // Auto-restart interface if bandwidth settings changed
    if (bandwidthChanged) {
      await WireGuard.Restart();
    }

    return { success: true };
  }
);
