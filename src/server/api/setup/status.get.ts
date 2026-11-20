import { defineEventHandler } from 'nuxt/server';

import { status } from '#server/features/setup';

export default defineEventHandler(() => status());
