import { GeneralUpdateSchema } from '#db/repositories/general/types';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const data = await readValidatedBody(
      event,
      validateZod(GeneralUpdateSchema, event)
    );

    // Allow all updates to be saved to database
    // Overrides will be applied when reading/using the values
    await Database.general.update(data);
    return { success: true };
  }
);
