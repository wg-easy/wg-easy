import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { tag } from './schema';

import {
  controlStringRefine,
  safeStringRefine,
  t,
} from '#server/utils/types';

export type TagType = InferSelectModel<typeof tag>;

const name = z
  .string({ message: t('zod.tag.name') })
  .min(1, t('zod.tag.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

const description = z
  .string()
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

const tagId = z.coerce.number({ message: t('zod.tag.id') });

export const TagGetSchema = z.object({
  tagId: tagId,
});
