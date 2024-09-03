import { DatabaseError } from '~~/services/database/repositories/database';

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  try {
    const { username, password } = await readValidatedBody(
      event,
      validateZod(passwordType)
    );
    await Database.newUserWithPassword(username, password);
    return { success: true };
  } catch (error) {
    if (error instanceof DatabaseError) {
      const t = await useTranslation(event);
      throw createError({
        statusCode: 400,
        statusMessage: t(error.message),
        message: error.message,
      });
    } else {
      throw createError('Something happened !');
    }
  }
});
