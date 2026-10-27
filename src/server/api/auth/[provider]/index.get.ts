import { defineEventHandler, getValidatedQuery, sendRedirect } from 'h3';
import { z } from 'zod';

import { beginOAuth } from '#server/features/identity/session';
import { validateZod } from '#server/http/validation';

const OauthQuerySchema = z.object({ link: z.coerce.boolean().optional() });

export default defineEventHandler(async (event) => {
  const { link } = await getValidatedQuery(
    event,
    validateZod(OauthQuerySchema, event)
  );
  return sendRedirect(event, await beginOAuth(event, link));
});
