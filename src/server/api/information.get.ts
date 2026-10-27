import { defineEventHandler } from 'h3';

import * as system from '#server/features/system';

export default defineEventHandler(() => system.information());
