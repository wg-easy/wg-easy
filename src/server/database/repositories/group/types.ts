import type { InferSelectModel } from 'drizzle-orm';
import z from 'zod';

import type { group } from './schema';

import {
  controlStringRefine,
  safeStringRefine,
  schemaForType,
  t,
} from '#server/utils/types';

export type GroupType = InferSelectModel<typeof group>;

export type CreateGroupType = Omit<GroupType, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateGroupType = CreateGroupType;

const name = z
  .string({ message: t('zod.group.name') })
  .min(1, t('zod.group.name'))
  .pipe(safeStringRefine)
  .pipe(controlStringRefine);

const color = z
  .string({ message: t('zod.group.color') })
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: t('zod.group.color'),
  })
  .nullable();

export const GroupCreateSchema = schemaForType<CreateGroupType>()(
  z.object({
    name: name,
    color: color,
  })
);

export type GroupCreateType = z.infer<typeof GroupCreateSchema>;

export const GroupUpdateSchema = schemaForType<UpdateGroupType>()(
  z.object({
    name: name,
    color: color,
  })
);

export type GroupUpdateType = z.infer<typeof GroupUpdateSchema>;

const groupId = z.coerce.number({ message: t('zod.group.id') });

export const GroupGetSchema = z.object({
  groupId: groupId,
});
