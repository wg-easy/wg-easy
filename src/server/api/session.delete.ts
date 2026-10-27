import { defineEventHandler } from 'h3';

import { logout } from '#server/features/identity/session';

export default defineEventHandler(logout);
