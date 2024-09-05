import type { Low } from 'lowdb';
import type { Database } from '../repositories/database';
import { ChartType } from '../repositories/system';
import { parseCidr } from 'cidr-tools';
import { stringifyIp } from 'ip-bigint';

export async function run1(db: Low<Database>) {
  const privateKey = await exec('wg genkey');
  const publicKey = await exec(`echo ${privateKey} | wg pubkey`, {
    log: 'echo ***hidden*** | wg pubkey',
  });
  const addressRange = '10.8.0.0/24';
  const addressRange6 = 'fdcc:ad94:bacf:61a4::cafe:0/112';
  const cidr = parseCidr(addressRange);
  const cidr6 = parseCidr(addressRange6);
  const database: Database = {
    migrations: [],
    system: {
      interface: {
        privateKey: privateKey,
        publicKey: publicKey,
        address: stringifyIp({ number: cidr.start + 1n, version: 4 }),
        address6: stringifyIp({ number: cidr6.start + 1n, version: 6 }),
      },
      sessionTimeout: 3600, // 1 hour
      lang: 'en',
      userConfig: {
        mtu: 1420,
        persistentKeepalive: 0,
        addressRange: addressRange,
        addressRange6: addressRange6,
        defaultDns: ['1.1.1.1', '2606:4700:4700::1111'],
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
    },
    users: [],
    clients: {},
  };

  // TODO: use variables inside up/down script
  // TODO: properly check if ipv6 support
  database.system.iptables.PostUp = `
iptables -t nat -A POSTROUTING -s ${database.system.userConfig.addressRange} -o ${database.system.wgDevice} -j MASQUERADE;
iptables -A INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
iptables -A FORWARD -i wg0 -j ACCEPT;
iptables -A FORWARD -o wg0 -j ACCEPT;
ip6tables -t nat -A POSTROUTING -s ${database.system.userConfig.addressRange6} -o ${database.system.wgDevice} -j MASQUERADE;
ip6tables -A INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
ip6tables -A FORWARD -i wg0 -j ACCEPT;
ip6tables -A FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');

  database.system.iptables.PostDown = `
iptables -t nat -D POSTROUTING -s ${database.system.userConfig.addressRange} -o ${database.system.wgDevice} -j MASQUERADE;
iptables -D INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
iptables -D FORWARD -i wg0 -j ACCEPT;
iptables -D FORWARD -o wg0 -j ACCEPT;
ip6tables -t nat -D POSTROUTING -s ${database.system.userConfig.addressRange6} -o ${database.system.wgDevice} -j MASQUERADE;
ip6tables -D INPUT -p udp -m udp --dport ${database.system.wgPort} -j ACCEPT;
ip6tables -D FORWARD -i wg0 -j ACCEPT;
ip6tables -D FORWARD -o wg0 -j ACCEPT;
`
    .split('\n')
    .join(' ');

  db.data = database;
  db.write();
}
