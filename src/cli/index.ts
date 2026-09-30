#!/usr/bin/env node

import type { Resolvable, SubCommandsDef } from 'citty';
import { defineCommand, runMain } from 'citty';

import packageJson from '../package.json';

// Commands
import clientsList from '#cli/clients/list';
import clientsQr from '#cli/clients/qr';
import dbAdminReset from '#cli/admin/reset';

const subCommands = [dbAdminReset, clientsList, clientsQr] as const;

// from citty
function resolveValue<T>(input: Resolvable<T>): T | Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof input === 'function' ? (input as any)() : input;
}

async function generateSubCommands(): Promise<SubCommandsDef> {
  const subCommandsMap: Record<string, SubCommandsDef[string]> = {};

  for (const cmd of subCommands) {
    const cmdMeta = await resolveValue(cmd.meta || {});
    if (!cmdMeta.name) {
      console.warn('Skipping command without name:', cmd);
      continue;
    }
    subCommandsMap[cmdMeta.name] = cmd;
  }

  return subCommandsMap;
}

const subCommandsMap = await generateSubCommands();

const main = defineCommand({
  meta: {
    name: 'wg-easy',
    version: packageJson.version,
    description: 'Command Line Interface',
  },
  subCommands: subCommandsMap,
});

runMain(main);
