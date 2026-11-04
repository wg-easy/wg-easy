import { defineEventHandler } from 'nuxt/server';

import { cancelLogin } from '#server/features/identity/session';

export default defineEventHandler(cancelLogin);
