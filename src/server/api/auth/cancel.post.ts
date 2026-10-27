import { defineEventHandler } from 'h3';

import { cancelLogin } from '#server/features/identity/session';

export default defineEventHandler(cancelLogin);
