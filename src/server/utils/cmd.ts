import { exec as execShell } from 'node:child_process';
import { promisify } from 'node:util';

import { createDebug } from 'obug';

const CMD_DEBUG = createDebug('CMD');
const run = promisify(execShell);

type CommandOptions = { log?: boolean | string; output?: 'stdout' | 'stderr' };

export async function exec(
  cmd: string,
  { log = true, output = 'stdout' }: CommandOptions = {}
) {
  if (typeof log === 'string') {
    CMD_DEBUG(`$ ${log}`);
  } else if (log === true) {
    CMD_DEBUG(`$ ${cmd}`);
  }

  if (process.platform !== 'linux') {
    return '';
  }

  const result = await run(cmd, { shell: 'bash' });
  return result[output].trim();
}
