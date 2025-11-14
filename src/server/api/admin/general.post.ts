import { GeneralUpdateSchema } from '#db/repositories/general/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(GeneralUpdateSchema, event)
    );

    // Remove overridden fields from the update data
    const updateData = { ...data };
    if (WG_GENERAL_OVERRIDE_ENV.SESSION_TIMEOUT !== undefined) {
      delete updateData.sessionTimeout;
    }
    if (WG_GENERAL_OVERRIDE_ENV.METRICS_PROMETHEUS !== undefined) {
      delete updateData.metricsPrometheus;
    }
    if (WG_GENERAL_OVERRIDE_ENV.METRICS_JSON !== undefined) {
      delete updateData.metricsJson;
    }

    await Database.general.update(updateData);
    return { success: true };
  }
);
