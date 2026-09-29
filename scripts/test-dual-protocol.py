#!/usr/bin/env python3
"""Docker integration test. Usage: python3 scripts/test-dual-protocol.py [image].

Requires Docker and /dev/net/tun in its Linux VM. Uses an isolated network,
temporary volume and loopback-only ephemeral HTTP port; cleans up on exit.
Set AWG_UPGRADE_FROM to an older image to also test an existing AWG database.
"""
import concurrent.futures
import hashlib
import http.cookiejar
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

image = sys.argv[1] if len(sys.argv) > 1 else 'awg-easy:dual'
prefix = 'awg-dual-test-' + secrets.token_hex(4)
server, network, volume = prefix + '-server', prefix + '-net', prefix + '-data'
peers = {p: prefix + '-' + p for p in ('awg', 'wg')}
password = secrets.token_urlsafe(24)
base = ''
http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def docker(*args, **kwargs):
    return subprocess.check_output(['docker', *args], text=True, **kwargs).strip()


def req(path, body=None, method=None):
    data = None if body is None else json.dumps(body).encode()
    return http.open(urllib.request.Request(base + path, data=data, headers={
        'Content-Type': 'application/json', 'Origin': base,
    }, method=method), timeout=10).read()


def start(tag, dual):
    global base
    docker('run', '-d', '--name', server, '--network', network, '--cap-add', 'NET_ADMIN',
           '--device', '/dev/net/tun', '--sysctl', 'net.ipv4.ip_forward=1',
           '--sysctl', 'net.ipv4.conf.all.src_valid_mark=1', '-v', volume + ':/etc/wireguard',
           '-p', '127.0.0.1::51821', '-e', 'INSECURE=true', '-e', 'DISABLE_IPV6=true',
           '-e', 'INIT_ENABLED=true', '-e', 'INIT_USERNAME=smoketest',
           '-e', 'INIT_PASSWORD=' + password, '-e', 'INIT_HOST=' + server,
           '-e', 'INIT_PORT=51820', tag)
    port = docker('port', server, '51821/tcp').rsplit(':', 1)[1]
    base = 'http://127.0.0.1:' + port
    wait_ready(dual)
    assert json.loads(req('/api/auth/password', {
        'username': 'smoketest', 'password': password, 'remember': False,
    }))['status'] == 'success'


def wait_ready(dual=True):
    global base
    port = docker('port', server, '51821/tcp').rsplit(':', 1)[1]
    base = 'http://127.0.0.1:' + port
    for _ in range(60):
        try:
            docker('exec', server, 'awg', 'show', 'wg0', stderr=subprocess.DEVNULL)
            if dual:
                docker('exec', server, 'wg', 'show', 'wg1', stderr=subprocess.DEVNULL)
            req('/api/session')
            return
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError('VPN server did not become ready')


def conf(cid):
    return req(f'/api/client/{cid}/configuration').decode()


def digest(name):
    return hashlib.sha256(docker('exec', server, 'cat', '/etc/wireguard/' + name + '.conf').encode()).hexdigest()


def ping(protocol):
    subnet = '10.8.0.1' if protocol == 'awg' else '10.9.0.1'
    docker('exec', peers[protocol], 'ping', '-c', '3', '-W', '3', subnet)


try:
    docker('network', 'create', network)
    docker('volume', 'create', volume)
    old = os.environ.get('AWG_UPGRADE_FROM')
    ids = {}
    if old:
        start(old, False)
        ids['awg'] = json.loads(req('/api/client', {'name': 'existing-awg', 'expiresAt': None}))['clientId']
        old_config = conf(ids['awg'])
        old_digest = digest('wg0')
        docker('rm', '-f', server)
    start(image, True)
    if old:
        assert conf(ids['awg']) == old_config, 'existing AWG client changed during upgrade'
        assert digest('wg0') == old_digest, 'existing AWG server changed during upgrade'
        print('PASS: existing AWG database upgraded without key/config changes', flush=True)
    for protocol in ('awg', 'wg'):
        if protocol not in ids:
            ids[protocol] = json.loads(req('/api/client', {
                'name': protocol + '-client', 'expiresAt': None, 'protocol': protocol,
            }))['clientId']
        config = conf(ids[protocol])
        assert ('HeaderProtectionKey = ' in config) == (protocol == 'awg')
        assert f'Endpoint = {server}:' + ('51820' if protocol == 'awg' else '51822') in config
        assert b'<svg' in req(f'/api/client/{ids[protocol]}/qrcode.svg')
        if protocol == 'wg':
            assert not any(line.startswith(('Jc =', 'Jmin =', 'Jmax =', 'S1 =', 'S2 =', 'S3 =', 'S4 =', 'H1 =', 'H2 =', 'H3 =', 'H4 =', 'RandomTrailers =', 'DisableCookies =')) for line in config.splitlines())
        subnet = '10.8.0.0/24' if protocol == 'awg' else '10.9.0.0/24'
        config = '\n'.join('AllowedIPs = ' + subnet if line.startswith('AllowedIPs =') else line
                           for line in config.splitlines() if not line.startswith('DNS =')) + '\n'
        docker('run', '-d', '--name', peers[protocol], '--network', network,
               '--cap-add', 'NET_ADMIN', '--device', '/dev/net/tun', '--entrypoint', 'sleep', image, 'infinity')
        docker('exec', '-i', peers[protocol], 'sh', '-c',
               'mkdir -p /etc/wireguard; umask 077; cat > /etc/wireguard/test.conf', input=config)
        docker('exec', peers[protocol], protocol + '-quick', 'up', 'test', stderr=subprocess.DEVNULL)
    with concurrent.futures.ThreadPoolExecutor() as pool:
        list(pool.map(ping, ('awg', 'wg')))
    statuses = json.loads(req('/api/client'))
    for protocol, cid in ids.items():
        entry = next(c for c in statuses if c['id'] == cid)
        assert entry['protocol'] == protocol
        assert entry['latestHandshakeAt'] and entry['transferRx'] > 0
        detail = json.loads(req(f'/api/client/{cid}'))
        assert detail['protocol'] == protocol
        # WG edits must validate against WG's subnet, not the AWG subnet.
        detail['name'] += '-edited'
        req(f'/api/client/{cid}', detail)
    assert len(docker('exec', server, 'awg', 'show', 'wg0', 'peers').splitlines()) == 1
    assert len(docker('exec', server, 'wg', 'show', 'wg1', 'peers').splitlines()) == 1
    print('PASS: simultaneous WG/AWG handshake, traffic, stats, editing, config and QR export', flush=True)
    # Reject overlapping subnets, including invalid protocol requests.
    try:
        req('/api/admin/interface/cidr?protocol=wg', {'ipv4Cidr': '10.8.0.0/24', 'ipv6Cidr': 'fd00:9::/64'})
        raise AssertionError('overlap was accepted')
    except urllib.error.HTTPError as e:
        assert e.code == 400
    try:
        req('/api/admin/interface?protocol=invalid')
        raise AssertionError('invalid protocol was accepted')
    except urllib.error.HTTPError as e:
        assert e.code == 400
    awg_before = conf(ids['awg'])
    req('/api/admin/interface/cidr?protocol=wg', {'ipv4Cidr': '10.19.0.0/24', 'ipv6Cidr': 'fdcc:ad94:bacf:61a6::/112'})
    assert conf(ids['awg']) == awg_before
    assert 'Address = 10.19.0.2/32' in conf(ids['wg'])
    req('/api/admin/interface/cidr?protocol=wg', {'ipv4Cidr': '10.9.0.0/24', 'ipv6Cidr': 'fdcc:ad94:bacf:61a5::/112'})
    before = [digest('wg0'), digest('wg1')]
    docker('restart', server)
    wait_ready()
    assert before == [digest('wg0'), digest('wg1')]
    for protocol in ('awg', 'wg'):
        docker('exec', peers[protocol], protocol + '-quick', 'down', 'test', stderr=subprocess.DEVNULL)
        docker('exec', peers[protocol], protocol + '-quick', 'up', 'test', stderr=subprocess.DEVNULL)
        ping(protocol)
    req(f'/api/client/{ids["wg"]}', method='DELETE')
    assert not docker('exec', server, 'wg', 'show', 'wg1', 'peers')
    ping('awg')
    print('PASS: CIDR isolation, restart persistence, reconnection, WG revocation without affecting AWG', flush=True)
except Exception:
    print(docker('logs', '--tail', '30', server, stderr=subprocess.STDOUT), file=sys.stderr)
    raise
finally:
    subprocess.run(['docker', 'rm', '-f', server, *peers.values()], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['docker', 'network', 'rm', network], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['docker', 'volume', 'rm', volume], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
