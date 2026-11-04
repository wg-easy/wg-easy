import { defineEventHandler } from 'nuxt/server';

import * as system from '#server/features/system';

export default defineEventHandler(() => system.information());
