import { defineEventHandler } from 'nuxt/server';

import { logout } from '#server/features/identity/session';

export default defineEventHandler(logout);
