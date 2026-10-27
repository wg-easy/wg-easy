import { z } from 'zod';

import { safeStringRefine, t } from '#shared/contracts/validation';

const oneTimeLinkType = z
  .string({ message: t('zod.otl') })
  .min(1, t('zod.otl'))
  .pipe(safeStringRefine);

export const OneTimeLinkGetSchema = z.object({
  oneTimeLink: oneTimeLinkType,
});
