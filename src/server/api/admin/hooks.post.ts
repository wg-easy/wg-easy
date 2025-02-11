import { HooksUpdateSchema } from '#db/repositories/hooks/types';

export default definePermissionEventHandler(
  'admin',
  'any',
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
