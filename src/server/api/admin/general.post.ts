import { GeneralUpdateSchema } from '#db/repositories/general/types';

export default defineEventHandler(async (event) => {
  const data = await readValidatedBody(
    event,
    validateZod(GeneralUpdateSchema, event)
  );
  await Database.general.update(data);
  return { success: true };
});
