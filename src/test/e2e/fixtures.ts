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
  startProcess: (disableIpv6?: boolean) => Promise<string>;
  stopProcess: (signal: 'KILL' | 'TERM') => Promise<void>;
  logs: () => Promise<string>;
  connectClient: (configuration: string, index?: number) => Promise<void>;
  execClient: (args: string[], index?: number) => Promise<string>;
  execServer: (args: string[]) => Promise<string>;
  pingFromClient: (address: string, index?: number) => Promise<boolean>;
};

export const credentials = {
  username: 'e2e-admin',
  password: 'e2e-only-password-123!',
};

export const test = base.extend<{
  app: App;
  initialized: boolean;
  keepNamespace: boolean;
  strictReversePath: boolean;
  ipv6: boolean;
  backend: 'wg' | 'awg';
}>({
  strictReversePath: [false, { option: true }],
  keepNamespace: [false, { option: true }],
  initialized: [true, { option: true }],
  ipv6: [false, { option: true }],
  backend: ['wg', { option: true }],
  app: [
    async (
      { initialized, ipv6, backend, keepNamespace, strictReversePath },
      use,
      testInfo
    ) => {
      const runDir = process.env.E2E_RUN_DIR;
      if (!runDir) {
        throw new Error('Run pnpm test:e2e to manage test containers.');
      }

      const project = `wg-easy-e2e-${randomUUID()}`;
      const server = keepNamespace ? 'wg-easy-recovery' : 'wg-easy';
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
              COMPOSE_PROFILES: keepNamespace ? 'recovery' : '',
              E2E_BACKEND: backend,
              E2E_RP_FILTER: strictReversePath ? '1' : '0',
              E2E_INITIALIZED: String(initialized),
              E2E_DISABLE_IPV6: String(!ipv6),
            },
            timeout: 120_000,
            maxBuffer: 4 * 1024 * 1024,
          }
        );
        command.child.stdin?.end(input);
        return (await command).stdout.trim();
      }
      const wg = (args: string[], input?: string) =>
        compose(['exec', '-T', server, backend, ...args], input);
      const execClient = (args: string[], index = 1, input?: string) =>
        compose(
          ['exec', '-T', '--index', String(index), 'vpn-client', ...args],
          input
        );
      const getUrl = async () =>
        `http://${await compose(['port', server, '51821'])}`;

      const execServer = (args: string[]) =>
        compose(['exec', '-T', server, ...args]);
      const startProcess = (disableIpv6 = !ipv6) =>
        compose([
          'exec',
          '-T',
          '-d',
          '-e',
          'DISABLE_IPV6=' + String(disableIpv6),
          server,
          'sh',
          '-ec',
          'echo $$ > /tmp/e2e-node.pid; exec iptables-backend node server/index.mjs >/proc/1/fd/1 2>/proc/1/fd/2',
        ]);
      try {
        if (keepNamespace) {
          await compose(['up', '-d', server]);
          await startProcess();
        }
        await compose(['up', '-d', '--wait', '--wait-timeout', '90', server]);
        await use({
          url: await getUrl(),
          peers: async () =>
            (await wg(['show', 'wg0', 'peers'])).split(/\s+/).filter(Boolean),
          publicKey: (privateKey) => wg(['pubkey'], `${privateKey}\n`),
          serverPublicKey: () => wg(['show', 'wg0', 'public-key']),
          execClient,
          execServer,
          startProcess,
          stopProcess: async (signal) => {
            await execServer([
              'sh',
              '-ec',
              `pid=$(cat /tmp/e2e-node.pid); kill -${signal} "$pid"; while kill -0 "$pid" 2>/dev/null; do sleep 0.1; done`,
            ]);
          },
          logs: () => compose(['logs', '--no-color', server]),
          connectClient: async (configuration, index = 1) => {
            await compose([
              'up',
              '-d',
              '--scale',
              `vpn-client=${index}`,
              'vpn-client',
            ]);
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
${backend}-quick up wg0`,
              ],
              index,
              configuration
            );
          },
          pingFromClient: async (address, index) => {
            try {
              await execClient(
                ['ping', '-4', '-I', 'wg0', '-c', '1', '-W', '1', address],
                index
              );
              return true;
            } catch (error) {
              if ((error as ExecException).code !== 1) {
                throw error;
              }
              return false;
            }
          },
          restart: async () => {
            await compose(['restart', server]);
            await compose([
              'up',
              '-d',
              '--wait',
              '--wait-timeout',
              '90',
              server,
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
