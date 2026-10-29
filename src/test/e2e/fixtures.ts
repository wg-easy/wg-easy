import { execFile, type ExecException } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { test as base } from '@playwright/test';

const exec = promisify(execFile);
const composeFile = fileURLToPath(
  new URL('../../../docker-compose.test.yml', import.meta.url)
);

type App = {
  url: string;
  peers: () => Promise<string[]>;
  publicKey: (privateKey: string) => Promise<string>;
  serverPublicKey: () => Promise<string>;
  restart: () => Promise<string>;
  connectClient: (configuration: string) => Promise<void>;
  pingFromClient: (address: string) => Promise<boolean>;
};

export const credentials = {
  username: 'e2e-admin',
  password: 'e2e-only-password-123!',
};

export const test = base.extend<{ app: App; initialized: boolean }>({
  initialized: [true, { option: true }],
  app: [
    async ({ initialized }, use, testInfo) => {
      const runDir = process.env.E2E_RUN_DIR;
      if (!runDir)
        throw new Error('Run pnpm test:e2e to manage test containers.');

      const project = `wg-easy-e2e-${randomUUID()}`;
      // Fixture teardown can be skipped when startup is interrupted.
      await appendFile(`${runDir}/projects`, `${project}\n`);
      async function compose(args: string[], input?: string) {
        const command = exec(
          'docker',
          [
            'compose',
            '--env-file',
            '/dev/null',
            '-f',
            composeFile,
            '-p',
            project,
            ...args,
          ],
          {
            env: {
              ...process.env,
              E2E_INITIALIZED: String(initialized),
            },
            timeout: 120_000,
            maxBuffer: 4 * 1024 * 1024,
          }
        );
        command.child.stdin?.end(input);
        return (await command).stdout.trim();
      }
      const wg = (args: string[], input?: string) =>
        compose(['exec', '-T', 'wg-easy', 'wg', ...args], input);
      const execClient = (args: string[], input?: string) =>
        compose(['exec', '-T', 'vpn-client', ...args], input);
      const getUrl = async () =>
        `http://${await compose(['port', 'wg-easy', '51821'])}`;

      try {
        await compose([
          'up',
          '-d',
          '--wait',
          '--wait-timeout',
          '90',
          'wg-easy',
        ]);
        await use({
          url: await getUrl(),
          peers: async () =>
            (await wg(['show', 'wg0', 'peers'])).split(/\s+/).filter(Boolean),
          publicKey: (privateKey) => wg(['pubkey'], `${privateKey}\n`),
          serverPublicKey: () => wg(['show', 'wg0', 'public-key']),
          connectClient: async (configuration) => {
            await compose(['up', '-d', 'vpn-client']);
            await execClient(
              [
                'sh',
                '-ec',
                `umask 077
cat > /etc/wireguard/wg0.conf
# Initialize resolvconf while preserving Docker's DNS for endpoint lookup.
cp /etc/resolv.conf /tmp/docker-resolv.conf
resolvconf -u
resolvconf -a eth0 < /tmp/docker-resolv.conf
wg-quick up wg0`,
              ],
              configuration
            );
          },
          pingFromClient: async (address) => {
            try {
              await execClient([
                'ping',
                '-4',
                '-I',
                'wg0',
                '-c',
                '1',
                '-W',
                '1',
                address,
              ]);
              return true;
            } catch (error) {
              if ((error as ExecException).code !== 1) throw error;
              return false;
            }
          },
          restart: async () => {
            await compose(['restart', 'wg-easy']);
            await compose([
              'up',
              '-d',
              '--wait',
              '--wait-timeout',
              '90',
              'wg-easy',
            ]);
            // Docker can assign a different ephemeral host port on restart.
            return getUrl();
          },
        });
      } finally {
        try {
          await testInfo.attach('container.log', {
            body: await compose(['logs', '--no-color', '--timestamps']),
            contentType: 'text/plain',
          });
        } finally {
          await compose(['down', '--volumes', '--remove-orphans']);
        }
      }
    },
    { timeout: 180_000 },
  ],
  baseURL: async ({ app }, use) => use(app.url),
});

export { expect } from '@playwright/test';
