import { defineEventHandler } from 'nuxt/server';

import { pendingLogin } from '#server/features/identity/session';

export default defineEventHandler(pendingLogin);
