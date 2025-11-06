import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClientType } from '#db/repositories/client/types';
import type { InterfaceType } from '#db/repositories/interface/types';
import type { UserConfigType } from '#db/repositories/userConfig/types';
import type { HooksType } from '#db/repositories/hooks/types';

// Mock exec function
const mockExec = vi.fn();

// Mock iptablesTemplate function
const mockIptablesTemplate = vi.fn((template: string) => template);

// Make WG_ENV and auto-imports available globally for test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WG_ENV = {
  EXPERIMENTAL_AWG: false,
  OVERRIDE_AUTO_AWG: undefined,
  PORT: '51821',
};

// Make exec and iptablesTemplate available globally (Nuxt auto-imports simulation)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).exec = mockExec;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).iptablesTemplate = mockIptablesTemplate;

// Mock the module resolution for exec to prevent import errors
vi.mock('~/server/utils/cmd', () => ({
  exec: mockExec,
}));

vi.mock('~/server/utils/template', () => ({
  iptablesTemplate: mockIptablesTemplate,
}));

// Import wgHelper after setting up mocks
const { wg } = await import('./wgHelper');

describe('wgHelper', () => {
  const mockClient: Omit<ClientType, 'createdAt' | 'updatedAt'> = {
    id: 1,
    userId: 1,
    interfaceId: 'wg0',
    name: 'Test Client',
    enabled: true,
    ipv4Address: '10.8.0.2',
    ipv6Address: 'fd42:42:42::2',
    publicKey: 'clientPublicKey123',
    preSharedKey: 'preSharedKey123',
    privateKey: 'privateKey123',
    serverAllowedIps: ['192.168.1.0/24'],
    serverEndpoint: '192.168.1.100:51820',
    allowedIps: ['0.0.0.0/0', '::/0'],
    persistentKeepalive: 25,
    mtu: 1420,
    dns: ['1.1.1.1', '8.8.8.8'],
    expiresAt: null,
    preUp: '',
    postUp: '',
    preDown: '',
    postDown: '',
  };

  const mockInterface: InterfaceType = {
    name: 'wg0',
    device: 'wg0',
    enabled: true,
    ipv4Cidr: '10.8.0.0/24',
    ipv6Cidr: 'fd42:42:42::/64',
    port: 51820,
    mtu: 1420,
    publicKey: 'serverPublicKey123',
    privateKey: 'serverPrivateKey123',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockHooks: HooksType = {
    id: 'wg0',
    preUp: 'echo "PreUp"',
    postUp: 'iptables -A FORWARD -i wg0 -j ACCEPT',
    preDown: 'echo "PreDown"',
    postDown: 'iptables -D FORWARD -i wg0 -j ACCEPT',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const mockUserConfig: UserConfigType = {
    id: 'wg0',
    host: 'vpn.example.com',
    port: 51820,
    defaultDns: ['1.1.1.1', '1.0.0.1'],
    defaultAllowedIps: ['0.0.0.0/0', '::/0'],
    defaultMtu: 1420,
    defaultPersistentKeepalive: 25,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  describe('generateServerPeer', () => {
    it('should generate server peer configuration with IPv6 enabled', () => {
      const result = wg.generateServerPeer(mockClient, { enableIpv6: true });

      expect(result).toContain('# Client: Test Client (1)');
      expect(result).toContain('[Peer]');
      expect(result).toContain('PublicKey = clientPublicKey123');
      expect(result).toContain('PresharedKey = preSharedKey123');
      expect(result).toContain(
        'AllowedIPs = 10.8.0.2/32, fd42:42:42::2/128, 192.168.1.0/24'
      );
      expect(result).toContain('Endpoint = 192.168.1.100:51820');
    });

    it('should generate server peer configuration with IPv6 disabled', () => {
      const result = wg.generateServerPeer(mockClient, { enableIpv6: false });

      expect(result).toContain('# Client: Test Client (1)');
      expect(result).toContain('[Peer]');
      expect(result).toContain('PublicKey = clientPublicKey123');
      expect(result).toContain('PresharedKey = preSharedKey123');
      expect(result).toContain('AllowedIPs = 10.8.0.2/32, 192.168.1.0/24');
      expect(result).not.toContain('fd42:42:42::2/128');
    });

    it('should handle client without server endpoint', () => {
      const clientWithoutEndpoint = { ...mockClient, serverEndpoint: null };
      const result = wg.generateServerPeer(clientWithoutEndpoint);

      expect(result).not.toContain('Endpoint =');
    });

    it('should handle client without serverAllowedIps', () => {
      const clientWithoutAllowedIps = { ...mockClient, serverAllowedIps: [] };
      const result = wg.generateServerPeer(clientWithoutAllowedIps);

      expect(result).toContain('AllowedIPs = 10.8.0.2/32, fd42:42:42::2/128');
    });
  });

  describe('generateServerInterface', () => {
    it('should generate server interface configuration', () => {
      const result = wg.generateServerInterface(mockInterface, mockHooks, {
        enableIpv6: true,
      });

      expect(result).toContain('# Note: Do not edit this file directly.');
      expect(result).toContain('[Interface]');
      expect(result).toContain('PrivateKey = serverPrivateKey123');
      expect(result).toContain('Address = 10.8.0.1/24, fd42:42:42::1/64');
      expect(result).toContain('ListenPort = 51820');
      expect(result).toContain('MTU = 1420');
    });

    it('should generate server interface configuration without IPv6', () => {
      const result = wg.generateServerInterface(mockInterface, mockHooks, {
        enableIpv6: false,
      });

      expect(result).toContain('Address = 10.8.0.1/24');
      expect(result).not.toContain('fd42:42:42::1/64');
    });
  });

  describe('generateClientConfig', () => {
    it('should generate client configuration with IPv6 enabled', () => {
      const fullClient: ClientType = {
        ...mockClient,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const result = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        fullClient,
        { enableIpv6: true }
      );

      expect(result).toContain('[Interface]');
      expect(result).toContain('PrivateKey = privateKey123');
      expect(result).toContain('Address = 10.8.0.2/32, fd42:42:42::2/128');
      expect(result).toContain('MTU = 1420');
      expect(result).toContain('DNS = 1.1.1.1, 8.8.8.8');
      expect(result).toContain('[Peer]');
      expect(result).toContain('PublicKey = serverPublicKey123');
      expect(result).toContain('PresharedKey = preSharedKey123');
      expect(result).toContain('AllowedIPs = 0.0.0.0/0, ::/0');
      expect(result).toContain('PersistentKeepalive = 25');
      expect(result).toContain('Endpoint = vpn.example.com:51820');
    });

    it('should generate client configuration with IPv6 disabled', () => {
      const fullClient: ClientType = {
        ...mockClient,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const result = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        fullClient,
        { enableIpv6: false }
      );

      expect(result).toContain('Address = 10.8.0.2/32');
      expect(result).not.toContain('fd42:42:42::2/128');
    });

    it('should use default DNS when client DNS is not set', () => {
      const clientWithoutDns: ClientType = {
        ...mockClient,
        dns: null,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const result = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        clientWithoutDns
      );

      expect(result).toContain('DNS = 1.1.1.1, 1.0.0.1');
    });

    it('should not include DNS line when DNS is empty', () => {
      const clientWithoutDns: ClientType = {
        ...mockClient,
        dns: null,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const configWithoutDns = { ...mockUserConfig, defaultDns: [] };
      const result = wg.generateClientConfig(
        mockInterface,
        configWithoutDns,
        clientWithoutDns
      );

      expect(result).not.toContain('DNS =');
    });

    it('should include client hooks when present', () => {
      const clientWithHooks: ClientType = {
        ...mockClient,
        preUp: 'echo "Client PreUp"',
        postUp: 'echo "Client PostUp"',
        preDown: 'echo "Client PreDown"',
        postDown: 'echo "Client PostDown"',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const result = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        clientWithHooks
      );

      expect(result).toContain('PreUp = echo "Client PreUp"');
      expect(result).toContain('PostUp = echo "Client PostUp"');
      expect(result).toContain('PreDown = echo "Client PreDown"');
      expect(result).toContain('PostDown = echo "Client PostDown"');
    });

    it('should use default allowedIps when client allowedIps is not set', () => {
      const clientWithoutAllowedIps: ClientType = {
        ...mockClient,
        allowedIps: null,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      const result = wg.generateClientConfig(
        mockInterface,
        mockUserConfig,
        clientWithoutAllowedIps
      );

      expect(result).toContain('AllowedIPs = 0.0.0.0/0, ::/0');
    });
  });

  describe('dump', () => {
    it('should parse wireguard dump output correctly', async () => {
      const mockDumpOutput = `private-key	public-key	listen-port	fwmark
publicKey1	psk1	192.168.1.100:12345	10.8.0.2/32	1699000000	1000000	2000000	25
publicKey2	(none)	(none)	10.8.0.3/32	0	500000	1500000	0`;

      mockExec.mockResolvedValue(mockDumpOutput);

      const result = await wg.dump('wg0');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        publicKey: 'publicKey1',
        preSharedKey: 'psk1',
        endpoint: '192.168.1.100:12345',
        allowedIps: '10.8.0.2/32',
        latestHandshakeAt: new Date(1699000000000),
        transferRx: 1000000,
        transferTx: 2000000,
        persistentKeepalive: '25',
      });
      expect(result[1]).toEqual({
        publicKey: 'publicKey2',
        preSharedKey: '(none)',
        endpoint: null,
        allowedIps: '10.8.0.3/32',
        latestHandshakeAt: null,
        transferRx: 500000,
        transferTx: 1500000,
        persistentKeepalive: '0',
      });
    });
  });

  describe('command execution functions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should execute generatePrivateKey command', async () => {
      mockExec.mockResolvedValue('generatedPrivateKey');

      const result = await wg.generatePrivateKey();

      expect(result).toBe('generatedPrivateKey');
      expect(mockExec).toHaveBeenCalledWith('wg genkey');
    });

    it('should execute getPublicKey command', async () => {
      mockExec.mockResolvedValue('generatedPublicKey');

      const result = await wg.getPublicKey('privateKey123');

      expect(result).toBe('generatedPublicKey');
      expect(mockExec).toHaveBeenCalledWith('echo privateKey123 | wg pubkey', {
        log: 'echo ***hidden*** | wg pubkey',
      });
    });

    it('should execute generatePreSharedKey command', async () => {
      mockExec.mockResolvedValue('generatedPSK');

      const result = await wg.generatePreSharedKey();

      expect(result).toBe('generatedPSK');
      expect(mockExec).toHaveBeenCalledWith('wg genpsk');
    });

    it('should execute up command', async () => {
      mockExec.mockResolvedValue('');

      await wg.up('wg0');

      expect(mockExec).toHaveBeenCalledWith('wg-quick up wg0');
    });

    it('should execute down command', async () => {
      mockExec.mockResolvedValue('');

      await wg.down('wg0');

      expect(mockExec).toHaveBeenCalledWith('wg-quick down wg0');
    });

    it('should execute restart command', async () => {
      mockExec.mockResolvedValue('');

      await wg.restart('wg0');

      expect(mockExec).toHaveBeenCalledWith(
        'wg-quick down wg0; wg-quick up wg0'
      );
    });

    it('should execute sync command', async () => {
      mockExec.mockResolvedValue('');

      await wg.sync('wg0');

      expect(mockExec).toHaveBeenCalledWith(
        'wg syncconf wg0 <(wg-quick strip wg0)'
      );
    });
  });
});
