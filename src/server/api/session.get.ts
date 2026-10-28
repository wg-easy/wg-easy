import { defineEventHandler } from 'nuxt/server';

import { currentSessionUser } from '#server/features/identity/session';

export default defineEventHandler(currentSessionUser);
