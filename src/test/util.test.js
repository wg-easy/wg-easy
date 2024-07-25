const { expect } = require('chai');
const Util = require('../lib/Util');

describe('Util Class', () => {
  it('should validate IPv4 addresses correctly', () => {
    expect(Util.isValidIPv4('0.0.0.0')).to.be.true;
    expect(Util.isValidIPv4('192.168.1.1')).to.be.true;
    expect(Util.isValidIPv4('255.255.255.255')).to.be.true;
    expect(Util.isValidIPv4('999.999.999.999')).to.be.false;
  });

  it('should identify CIDR correctly', () => {
    expect(Util.isCIDR('192.168.1.0/24')).to.be.true;
    expect(Util.isCIDR('192.168.1.1')).to.be.false;
  });

  it('should identify single IP addresses correctly', () => {
    expect(Util.isIPAddress('192.168.1.1')).to.be.true;
    expect(Util.isIPAddress('192.168.1.0/24')).to.be.false;
  });

  it('should validate iptables target correctly', () => {
    expect(Util.isValidIptablesTarget('ACCEPT')).to.be.true;
    expect(Util.isValidIptablesTarget('DROP')).to.be.true;
    expect(Util.isValidIptablesTarget('YEP!')).to.be.false;
  });

  it('should validate iptables protocol correctly', () => {
    expect(Util.isValidIptablesProtocol('UDP')).to.be.true;
    expect(Util.isValidIptablesProtocol('TCP')).to.be.true;
    expect(Util.isValidIptablesProtocol('PEY!')).to.be.false;
  });

  it('should return correct protocol name', () => {
    expect(Util.getProtocolName(6)).to.equal('TCP');
    expect(Util.getProtocolName(17)).to.equal('UDP');
    expect(Util.getProtocolName(999)).to.equal('Unknown Protocol');
  });

  it('should return correct target name', () => {
    expect(Util.getTargetName('ACCEPT')).to.equal('ALLOW');
    expect(Util.getTargetName('DROP')).to.equal('BLOCK');
    expect(Util.getTargetName('WAZUP!')).to.equal('Unknown Target');
  });
});
