import { DatabaseError } from '~/ports/database';

type Request = { username: string; password: string };

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json');
  try {
    // TODO use zod
    const { username, password } = await readBody<Request>(event);
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
