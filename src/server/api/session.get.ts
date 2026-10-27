import { defineEventHandler } from 'h3';

import { currentSessionUser } from '#server/features/identity/session';

export default defineEventHandler(currentSessionUser);
