import { DatabaseError } from '~/ports/database';

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
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    } else {
      throw createError('Something happened !');
    }
  }
});
