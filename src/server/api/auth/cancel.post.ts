import { defineEventHandler } from 'h3';

import { useWGSession } from '#server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await useWGSession(event);

  await session.update({
    pendingLogin: undefined,
    oauth_nonce: undefined,
    oauth_state: undefined,
    oauth_verifier: undefined,
  });

  return { success: true as const };
});
