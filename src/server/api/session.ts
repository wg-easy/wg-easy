import {
  REQUIRES_PASSWORD,
  SERVER_DEBUG,
  SESSION_CONFIG,
} from '~/utils/config';
import { isPasswordValid } from '~/utils/password';

export default defineEventHandler(async (event) => {
  if (isMethod(event, 'GET')) {
    const session = await useSession(event, SESSION_CONFIG);
    const authenticated = REQUIRES_PASSWORD
      ? !!(session.data && session.data.authenticated)
      : true;

    return {
      REQUIRES_PASSWORD,
      authenticated,
    };
  } else if (isMethod(event, 'POST')) {
    const session = await useSession(event, SESSION_CONFIG);
    const { password } = await readBody(event);

    if (!REQUIRES_PASSWORD) {
      // if no password is required, the API should never be called.
      // Do not automatically authenticate the user.
      throw createError({
        status: 401,
        message: 'Invalid state',
      });
    }

    if (!isPasswordValid(password)) {
      throw createError({
        status: 401,
        message: 'Incorrect Password',
      });
    }

    const data = await session.update({
      authenticated: true,
    });

    SERVER_DEBUG(`New Session: ${data.id}`);

    return { success: true };
  } else if (isMethod(event, 'DELETE')) {
    const session = await useSession(event, SESSION_CONFIG);
    const sessionId = session.id;

    await session.clear();

    SERVER_DEBUG(`Deleted Session: ${sessionId}`);
    return { success: true };
  }
});
