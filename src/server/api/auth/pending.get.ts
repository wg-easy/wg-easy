import { defineEventHandler } from 'h3';

import { pendingLogin } from '#server/features/identity/session';

export default defineEventHandler(pendingLogin);
