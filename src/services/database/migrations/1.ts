import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import packageJson from '@@/package.json';
import { ChartType } from '../repositories/system';

// TODO: use variables inside up/down script
const DEFAULT_ADDRESS = '10.8.0.x';
const DEFAULT_DEVICE = 'eth0';
const DEFAULT_WG_PORT = 51820;
const DEFAULT_POST_UP = `
iptables -t nat -A POSTROUTING -s ${DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${DEFAULT_DEVICE} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${DEFAULT_WG_PORT} -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
`
  .split('\n')
  .join(' ');
const DEFAULT_POST_DOWN = `
iptables -t nat -D POSTROUTING -s ${DEFAULT_ADDRESS.replace('x', '0')}/24 -o ${DEFAULT_DEVICE} -j MASQUERADE;
iptables -D INPUT -p udp -m udp --dport ${DEFAULT_WG_PORT} -j ACCEPT;
iptables -D FORWARD -i wg0 -j ACCEPT;
iptables -D FORWARD -o wg0 -j ACCEPT;
`
  .split('\n')
  .join(' ');

export async function run1(db: Low<Database>) {
  const privateKey = await exec('wg genkey');
  const publicKey = await exec(`echo ${privateKey} | wg pubkey`, {
    log: 'echo ***hidden*** | wg pubkey',
  });
  const database: Database = {
    migrations: [],
    system: {
      release: packageJson.release.version,
      interface: {
        privateKey: privateKey,
        publicKey: publicKey,
        address: DEFAULT_ADDRESS.replace('x', '1'),
      },
      sessionTimeout: 3600, // 1 hour
      lang: 'en',
      userConfig: {
        mtu: 1420,
        persistentKeepalive: 0,
        // TODO: assume handle CIDR to compute next ip in WireGuard
        rangeAddress: '10.8.0.0/24',
        defaultDns: ['1.1.1.1'],
        allowedIps: ['0.0.0.0/0', '::/0'],
      },
      wgPath: WG_PATH,
      wgDevice: DEFAULT_DEVICE,
      wgHost: WG_HOST || '',
      wgPort: DEFAULT_WG_PORT,
      wgConfigPort: 51820,
      iptables: {
        PreUp: '',
        PostUp: DEFAULT_POST_UP,
        PreDown: '',
        PostDown: DEFAULT_POST_DOWN,
      },
      trafficStats: {
        enabled: false,
        type: ChartType.None,
      },
      clientExpiration: {
        enabled: false,
      },
      oneTimeLinks: {
        enabled: false,
      },
      sortClients: {
        enabled: false,
      },
      prometheus: {
        enabled: false,
        password: null,
      },
      sessionConfig: {
        password: getRandomHex(256),
        name: 'wg-easy',
        cookie: undefined,
      },
    },
    users: [],
    clients: [],
  };

  db.data = database;
  db.write();
}
