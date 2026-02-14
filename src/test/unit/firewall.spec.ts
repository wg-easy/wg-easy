import { describe, expect, test } from 'vitest';
import { firewallTestExports } from '../../server/utils/firewall';
import { typesTestExports } from '../../server/utils/types';

describe('firewall', () => {
  describe('isValidFirewallEntry', () => {
    test('invalid ips', () => {
      expect(() => typesTestExports.FirewallIpEntrySchema.parse('')).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('255.255.255.256')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.256')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1.1')
      ).toThrow();

      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('[]:443/udp')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('[]:443')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('[::1]/32')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('[1.1.1.1]/32')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('[::g]/32')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('2001:dbx::1')
      ).toThrow();
    });
    test('invalid port, protocol or cidr', () => {
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1:80/tcpp')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1:65536')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1:0')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1/33')
      ).toThrow();
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1/32:0')
      ).toThrow();
    });
    test('protocol without port', () => {
      expect(() =>
        typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1/tcp')
      ).toThrow();
    });
    test('valid entries', () => {
      expect(typesTestExports.FirewallIpEntrySchema.parse('1.1.1.1')).toBe(
        '1.1.1.1'
      );
      expect(typesTestExports.FirewallIpEntrySchema.parse('::/0')).toBe('::/0');
      expect(typesTestExports.FirewallIpEntrySchema.parse('::0/0')).toBe(
        '::0/0'
      );
      expect(typesTestExports.FirewallIpEntrySchema.parse('2001:db8::1')).toBe(
        '2001:db8::1'
      );
      expect(typesTestExports.FirewallIpEntrySchema.parse('::1')).toBe('::1');
      expect(
        typesTestExports.FirewallIpEntrySchema.parse('2001:db8::1/32')
      ).toBe('2001:db8::1/32');
      expect(typesTestExports.FirewallIpEntrySchema.parse('[::1]')).toBe(
        '[::1]'
      );
      expect(firewallTestExports.parseFirewallEntry('[::1]')).toEqual({
        ip: '::1',
      });
    });
  });
  describe('parseFirewallEntry', () => {
    test('IPv4 with port and protocol', () => {
      expect(() =>
        firewallTestExports.parseFirewallEntry('1.1.1.1/tcp')
      ).toThrow();
      expect(() =>
        firewallTestExports.parseFirewallEntry('1.1.1.1/udp')
      ).toThrow();
      expect(firewallTestExports.parseFirewallEntry('1.1.1.1')).toEqual({
        ip: '1.1.1.1',
      });
      expect(firewallTestExports.parseFirewallEntry('1.1.1.1:80')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'both',
      });
      expect(firewallTestExports.parseFirewallEntry('1.1.1.1:80/tcp')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'tcp',
      });
      expect(firewallTestExports.parseFirewallEntry('1.1.1.1:80/udp')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'udp',
      });
    });

    test('IPv6 with port and protocol', () => {
      expect(() =>
        firewallTestExports.parseFirewallEntry('[2001:db8::1]/tcp')
      ).toThrow();
      expect(() =>
        firewallTestExports.parseFirewallEntry('[2001:db8::1]/udp')
      ).toThrow();
      expect(firewallTestExports.parseFirewallEntry('[2001:db8::1]')).toEqual({
        ip: '2001:db8::1',
      });
      expect(
        firewallTestExports.parseFirewallEntry('[2001:db8::1]:443')
      ).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'both',
      });
      expect(
        firewallTestExports.parseFirewallEntry('[2001:db8::1]:443/tcp')
      ).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'tcp',
      });
      expect(
        firewallTestExports.parseFirewallEntry('[2001:db8::1]:443/udp')
      ).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'udp',
      });

      expect(firewallTestExports.parseFirewallEntry('::0/0')).toEqual({
        ip: '::0/0',
      });
      expect(() =>
        firewallTestExports.parseFirewallEntry('::0/0/tcp')
      ).toThrow();
    });
  });
  describe('sanitizeComment', () => {
    test('basic ASCII name', () => {
      expect(firewallTestExports.sanitizeComment(1, 'My Laptop')).toBe(
        'client 1: My Laptop'
      );
    });
    test('strips non-ASCII and shell metacharacters', () => {
      expect(firewallTestExports.sanitizeComment(42, 'café')).toBe(
        'client 42: caf'
      );
      expect(firewallTestExports.sanitizeComment(5, 'a"; rm -rf /')).toBe(
        'client 5: a rm -rf '
      );
      expect(firewallTestExports.sanitizeComment(7, 'test$(cmd)`id`')).toBe(
        'client 7: testcmdid'
      );
    });
    test('preserves allowed punctuation', () => {
      expect(firewallTestExports.sanitizeComment(3, 'phone-2.lan_home')).toBe(
        'client 3: phone-2.lan_home'
      );
    });
    test('truncates to 256 bytes', () => {
      const longName = 'a'.repeat(300);
      const result = firewallTestExports.sanitizeComment(1, longName);
      expect(result.length).toBeLessThanOrEqual(256);
      expect(result).toBe('client 1: ' + 'a'.repeat(246));
    });
  });
  describe('generateRuleArgs', () => {
    test('includes comment when provided', () => {
      const rules = firewallTestExports.generateRuleArgs(
        '10.8.0.2',
        { ip: '10.0.0.1' },
        'client 1: test'
      );
      expect(rules).toEqual([
        '-A WG_CLIENTS -s 10.8.0.2 -d 10.0.0.1 -m comment --comment "client 1: test" -j ACCEPT',
      ]);
    });
    test('omits comment when not provided', () => {
      const rules = firewallTestExports.generateRuleArgs('10.8.0.2', {
        ip: '10.0.0.1',
      });
      expect(rules).toEqual([
        '-A WG_CLIENTS -s 10.8.0.2 -d 10.0.0.1 -j ACCEPT',
      ]);
    });
    test('comment with port generates two rules for both proto', () => {
      const rules = firewallTestExports.generateRuleArgs(
        '10.8.0.2',
        { ip: '10.0.0.1', port: 443, proto: 'both' },
        'client 2: phone'
      );
      expect(rules).toEqual([
        '-A WG_CLIENTS -s 10.8.0.2 -d 10.0.0.1 -p tcp --dport 443 -m comment --comment "client 2: phone" -j ACCEPT',
        '-A WG_CLIENTS -s 10.8.0.2 -d 10.0.0.1 -p udp --dport 443 -m comment --comment "client 2: phone" -j ACCEPT',
      ]);
    });
  });
});
