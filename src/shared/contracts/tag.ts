import z from 'zod';

import {
  controlStringRefine,
  safeStringRefine,
  t,
} from '#shared/contracts/validation';

const name = z
  .string({ message: t('validation.tag.name') })
  .trim()
  .min(1, t('validation.tag.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

const description = z
  .string({ message: t('validation.tag.description') })
  .pipe(safeStringRefine)
  .pipe(controlStringRefine)
  .nullable();

export const TagCreateSchema = z.object({
  name: name,
  description: description,
});

export type TagCreateType = z.infer<typeof TagCreateSchema>;

export const TagUpdateSchema = z.object({
  name: name,
  description: description,
});

export type TagUpdateType = z.infer<typeof TagUpdateSchema>;

const tagId = z.coerce.number({ message: t('validation.tag.id') });

export const TagGetSchema = z.object({
  tagId: tagId,
});
