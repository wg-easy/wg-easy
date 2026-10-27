import { createError } from 'h3';

import { importLegacyConfiguration } from './import';

import { changeCidr } from '#server/features/vpn/interface';
import { commit } from '#server/features/vpn/lifecycle';
import { getDatabase } from '#db';
import type { SetupStepType } from '#shared/contracts/general';
import { createPasswordUser } from '#server/features/identity/accounts';
import { getIpInformation } from '#server/utils/ip';

export type SetupAction = 2 | 4 | 'migrate';

function checkStep(state: SetupStepType, action: SetupAction) {
  if (state.done)
    throw createError({ statusCode: 400, statusMessage: 'Invalid state' });
  if (state.step !== 1 && state.step !== 3)
    throw createError({ statusCode: 500, statusMessage: 'Invalid setup step' });
  if (state.step === 1 ? action !== 2 : action !== 4 && action !== 'migrate') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid step' });
  }
  return state;
}

export function status() {
  return getDatabase().general.getSetupStep();
}

export async function assertStep(action: SetupAction) {
  return checkStep(await getDatabase().general.getSetupStep(), action);
}

export function createAdministrator(username: string, password: string) {
  return getDatabase().transaction(async (tx) => {
    checkStep(await tx.general.getSetupStep(), 2);
    await createPasswordUser(tx.users, username, password);
    await tx.general.update({ setupStep: 3 });
  });
}

export function configureEndpoint(host: string, port: number) {
  return commit(async (tx) => {
    checkStep(await tx.general.getSetupStep(), 4);
    await tx.userConfigs.update({ host, port });
    await tx.interfaces.update({ port });
    await tx.general.update({ setupStep: 0 });
  });
}

export function importConfiguration(file: string) {
  return commit(async (tx) => {
    checkStep(await tx.general.getSetupStep(), 'migrate');
    await importLegacyConfiguration(tx, file);
    await tx.general.update({ setupStep: 0 });
  }, 'restart');
}

export async function ipInformation() {
  checkStep(await getDatabase().general.getSetupStep(), 4);
  return getIpInformation((await getDatabase().interfaces.get()).name);
}

export type InitialSetup = {
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  ipv4Cidr?: string;
  ipv6Cidr?: string;
  dns?: string[];
  allowedIps?: string[];
};

/** Initial data and setup completion commit together, or neither does. */
export function initialize(config: InitialSetup) {
  return getDatabase().transaction(async (tx) => {
    if ((await tx.general.getSetupStep()).done) return;
    if (config.ipv4Cidr && config.ipv6Cidr) {
      await changeCidr(tx, {
        ipv4Cidr: config.ipv4Cidr,
        ipv6Cidr: config.ipv6Cidr,
      });
    }
    if (config.dns) await tx.userConfigs.update({ defaultDns: config.dns });
    if (config.allowedIps)
      await tx.userConfigs.update({ defaultAllowedIps: config.allowedIps });
    if (config.username && config.password && config.host && config.port) {
      await createPasswordUser(tx.users, config.username, config.password);
      await tx.userConfigs.update({ host: config.host, port: config.port });
      await tx.interfaces.update({ port: config.port });
      await tx.general.update({ setupStep: 0 });
    }
  });
}
