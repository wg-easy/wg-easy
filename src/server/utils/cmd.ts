import { exec as execShell } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

import { createDebug } from 'obug';

const CMD_DEBUG = createDebug('CMD');
const run = promisify(execShell);

type CommandOptions = {
  log?: boolean | string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  maxBuffer?: number;
};

export async function exec(
  cmd: string,
  { log = true, input, ...options }: CommandOptions = {}
) {
  if (typeof log === 'string') {
    CMD_DEBUG(`$ ${log}`);
  } else if (log === true) {
    CMD_DEBUG(`$ ${cmd}`);
  }

  if (process.platform !== 'linux') {
    return '';
  }

  const command = run(cmd, { shell: 'bash', ...options });
  const [{ stdout }] = await Promise.all([
    command,
    input === undefined ? undefined : pipeline([input], command.child.stdin!),
  ]);
  return stdout.trim();
}
