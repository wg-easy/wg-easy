import { createError } from 'nuxt/server';

import { authorize, type Actor } from './policies';

import { getDatabase } from '#db';
import type { Repositories } from '#db/store';
import type { TagCreateType, TagUpdateType } from '#shared/contracts/tag';

// Tags only organize clients, so changes never touch the WireGuard config.

async function assertUniqueName(
  tx: Repositories,
  name: string,
  excludeId?: number
) {
  if (await tx.tags.findByName(name, excludeId)) {
    throw createError({
      status: 409,
      statusText: 'Tag with this name already exists',
    });
  }
}

async function assertExists(tx: Repositories, tagId: number) {
  if (!(await tx.tags.get(tagId))) {
    throw createError({ status: 404, statusText: 'Tag not found' });
  }
}

export function list(actor: Actor) {
  authorize(actor, 'tags', 'view');
  return getDatabase().tags.getAll();
}

export function create(actor: Actor, data: TagCreateType) {
  authorize(actor, 'tags', 'create');
  return getDatabase().transaction(async (tx) => {
    await assertUniqueName(tx, data.name);
    const [created] = await tx.tags.insert(data);
    return created!.id;
  });
}

export function update(actor: Actor, tagId: number, data: TagUpdateType) {
  authorize(actor, 'tags', 'update');
  return getDatabase().transaction(async (tx) => {
    await assertExists(tx, tagId);
    await assertUniqueName(tx, data.name, tagId);
    await tx.tags.update(tagId, data);
  });
}

export function remove(actor: Actor, tagId: number) {
  authorize(actor, 'tags', 'delete');
  return getDatabase().transaction(async (tx) => {
    await assertExists(tx, tagId);
    // Assignments are removed by the client_tags foreign key cascade.
    await tx.tags.delete(tagId);
  });
}
