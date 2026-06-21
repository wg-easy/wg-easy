import { createError, defineEventHandler } from 'h3';

import { useWGSession } from '#server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  if (!session.data.pendingLogin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }
  if (new Date() > new Date(session.data.pendingLogin.expires_at)) {
    await session.update({
      pendingLogin: undefined,
    });

    throw createError({
      statusCode: 401,
      statusMessage: 'No pending authentication',
    });
  }

  return {
    type: session.data.pendingLogin.type,
  };
});
