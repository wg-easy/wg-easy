import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import packageJson from '@@/package.json';
import { ChartType } from '../repositories/system';
import ip from 'ip';

export async function run1(db: Low<Database>) {
  const privateKey = await exec('wg genkey');
  const publicKey = await exec(`echo ${privateKey} | wg pubkey`, {
    log: 'echo ***hidden*** | wg pubkey',
  });
  const addressRange = '10.8.0.0/24';
  const cidr = ip.cidrSubnet(addressRange);
  const database: Database = {
    migrations: [],
    system: {
      // TODO: move to var, no need for database
      release: packageJson.release.version,
      interface: {
        privateKey: privateKey,
        publicKey: publicKey,
        address: cidr.firstAddress,
      },
      sessionTimeout: 3600, // 1 hour
      lang: 'en',
      userConfig: {
        mtu: 1420,
        persistentKeepalive: 0,
        addressRange: addressRange,
        defaultDns: ['1.1.1.1'],
        allowedIps: ['0.0.0.0/0', '::/0'],
      },
      wgDevice: 'eth0',
      // TODO: wgHost has to be configured when onboarding
      wgHost: '',
      wgPort: 51820,
      wgConfigPort: 51820,
      iptables: {
        PreUp: '',
        PostUp: '',
        PreDown: '',
        PostDown: '',
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
        cookie: {},
      },
      cookieMaxAge: 24 * 60,
    },
    users: [],
    clients: {},
  };

  // TODO: use variables inside up/down script
  database.system.iptables.PostUp = `
iptables -t nat -A POSTROUTING -s ${database.system.userConfig.addressRange} -o ${database.system.wgDevice} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');
  database.system.iptables.PostDown = `
iptables -t nat -D POSTROUTING -s ${database.system.userConfig.addressRange} -o ${database.system.wgDevice} -j MASQUERADE;
iptables -D INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
iptables -D FORWARD -i wg0 -j ACCEPT;
iptables -D FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');

  db.data = database;
  db.write();
}
