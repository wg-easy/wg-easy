import { describe, expect, test } from 'vitest';
import { testExports } from '../../server/utils/firewall';
import { testExports as typesTextExports } from '../../server/utils/types';

describe('firewall', () => {
  describe('isValidFirewallEntry', () => {
    test('invalid ips', () => {
      expect(() => typesTextExports.FirewallIpEntrySchema.parse('')).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('255.255.255.256')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.256')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1.1')
      ).toThrow();

      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('[]:443/udp')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('[]:443')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('[::1]/32')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('[1.1.1.1]/32')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('[::g]/32')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('2001:dbx::1')
      ).toThrow();
    });
    test('invalid port, protocol or cidr', () => {
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1:80/tcpp')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1:65536')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1:0')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1/33')
      ).toThrow();
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1/32:0')
      ).toThrow();
    });
    test('protocol without port', () => {
      expect(() =>
        typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1/tcp')
      ).toThrow();
    });
    test('valid entries', () => {
      expect(typesTextExports.FirewallIpEntrySchema.parse('1.1.1.1')).toBe(
        '1.1.1.1'
      );
      expect(typesTextExports.FirewallIpEntrySchema.parse('::/0')).toBe('::/0');
      expect(typesTextExports.FirewallIpEntrySchema.parse('::0/0')).toBe(
        '::0/0'
      );
      expect(typesTextExports.FirewallIpEntrySchema.parse('2001:db8::1')).toBe(
        '2001:db8::1'
      );
      expect(typesTextExports.FirewallIpEntrySchema.parse('::1')).toBe('::1');
      expect(
        typesTextExports.FirewallIpEntrySchema.parse('2001:db8::1/32')
      ).toBe('2001:db8::1/32');
      expect(typesTextExports.FirewallIpEntrySchema.parse('[::1]')).toEqual({
        ip: '[::1]',
      });
    });
  });
  describe('parseFirewallEntry', () => {
    test('IPv4 with port and protocol', () => {
      expect(() => testExports.parseFirewallEntry('1.1.1.1/tcp')).toThrow();
      expect(() => testExports.parseFirewallEntry('1.1.1.1/udp')).toThrow();
      expect(testExports.parseFirewallEntry('1.1.1.1')).toEqual({
        ip: '1.1.1.1',
      });
      expect(testExports.parseFirewallEntry('1.1.1.1:80')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'both',
      });
      expect(testExports.parseFirewallEntry('1.1.1.1:80/tcp')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'tcp',
      });
      expect(testExports.parseFirewallEntry('1.1.1.1:80/udp')).toEqual({
        ip: '1.1.1.1',
        port: 80,
        proto: 'udp',
      });
    });

    test('IPv6 with port and protocol', () => {
      expect(() =>
        testExports.parseFirewallEntry('[2001:db8::1]/tcp')
      ).toThrow();
      expect(() =>
        testExports.parseFirewallEntry('[2001:db8::1]/udp')
      ).toThrow();
      expect(testExports.parseFirewallEntry('[2001:db8::1]')).toEqual({
        ip: '2001:db8::1',
      });
      expect(testExports.parseFirewallEntry('[2001:db8::1]:443')).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'both',
      });
      expect(testExports.parseFirewallEntry('[2001:db8::1]:443/tcp')).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'tcp',
      });
      expect(testExports.parseFirewallEntry('[2001:db8::1]:443/udp')).toEqual({
        ip: '2001:db8::1',
        port: 443,
        proto: 'udp',
      });

      expect(testExports.parseFirewallEntry('::0/0')).toEqual({
        ip: '::0/0',
      });
      expect(() => testExports.parseFirewallEntry('::0/0/tcp')).toThrow();
    });
  });
});
