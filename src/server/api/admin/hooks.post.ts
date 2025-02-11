import { HooksUpdateSchema } from '#db/repositories/hooks/types';

export default definePermissionEventHandler(
  actions.ADMIN,
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(HooksUpdateSchema, event)
    );
    await Database.hooks.update(data);
    await WireGuard.saveConfig();
    return { success: true };
  }
);
