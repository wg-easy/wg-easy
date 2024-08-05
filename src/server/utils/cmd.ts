import childProcess from 'child_process';

export function exec(
  cmd: string,
  { log }: { log: boolean | string } = { log: true }
) {
  if (typeof log === 'string') {
    console.log(`$ ${log}`);
  } else if (log === true) {
    console.log(`$ ${cmd}`);
  }

  if (process.platform !== 'linux') {
    return Promise.resolve('');
  }

  return new Promise<string>((resolve, reject) => {
    childProcess.exec(
      cmd,
      {
        shell: 'bash',
      },
      (err, stdout) => {
        if (err) return reject(err);
        return resolve(String(stdout).trim());
      }
    );
  });
}
