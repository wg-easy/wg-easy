import { defineEventHandler } from 'h3';

import { bindTranslationRequest } from '#server/http/translation';

// Register before any portable route needs @intlify/h3's translations.
export default defineEventHandler(bindTranslationRequest);
