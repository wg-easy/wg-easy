import { createError } from 'nuxt/server';

import {
  hashPassword,
  isPasswordValid,
  isValidPasswordHash,
} from '#server/utils/password';
import { getDatabase } from '#db';
import type { GeneralUpdateType } from '#shared/contracts/general';
import type { Actor } from '#shared/contracts/identity';
import { authorize } from '#server/features/authorization';

export function get(actor: Actor) {
  authorize(actor, 'admin', 'any');
  return getDatabase().general.getConfig();
}

export async function update(actor: Actor, data: GeneralUpdateType) {
  authorize(actor, 'admin', 'any');
  const password = data.metricsPassword;
  const metricsPassword =
    password !== null && !isValidPasswordHash(password)
      ? await hashPassword(password)
      : password;
  await getDatabase().general.update({ ...data, metricsPassword });
}

export async function authorizeMetrics(
  type: 'prometheus' | 'json',
  credentials?: { method: string; value?: string }
) {
  const config = await getDatabase().general.getMetricsConfig();
  if (config.password) {
    if (!credentials)
      throw createError({ status: 401, statusText: 'Unauthorized' });
    if (credentials.method !== 'Bearer' || !credentials.value)
      throw createError({
        status: 401,
        statusText: 'Bearer Auth required',
      });
    if (!(await isPasswordValid(credentials.value, config.password)))
      throw createError({ status: 401, statusText: 'Incorrect token' });
  }
  if (!config[type])
    throw createError({
      status: 400,
      statusText: 'Metrics not enabled',
    });
}
