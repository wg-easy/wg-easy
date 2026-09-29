# AWG Easy

Fork of [wg-easy](https://github.com/wg-easy/wg-easy) running AmneziaWG 3.1 and classic WireGuard simultaneously.
Based on upstream commit `5f2009a`. Upstream UI, authentication, client management,
QR export and database migrations are retained. Original documentation is in
[README.upstream.md](README.upstream.md); this file describes the fork's defaults.

## What changes

- Two independent interfaces use `awg` / `awg-quick` and `wg` / `wg-quick`, with separate keys, ports, subnets, peers and firewall chains. Choose the protocol when creating a client; AWG remains the default.
- Bundles amneziawg-tools `v3.1.20260812` and amneziawg-go `v3.1.20260828`.
- New databases receive a random 32-byte header-protection key, unique H1–H4,
  S1/S2/S3/S4 = 128/56/12/12, ContentPaddingAddition = 0-64,
  RandomTrailers = on and DisableCookies = on.
- Shared parameters are exported identically to clients; new clients copy the
  server's padding and cookie policy. Individual client settings remain editable.
- Health checks query the configured AWG interface. `/dev/net/tun` allows the
  official AWG userspace fallback when the host has no AWG kernel module.

## Run on a Linux host

```sh
docker compose up -d --build
```

The host needs Docker Compose, `/dev/net/tun`, IPv6 support for the included
Compose network, and UDP 51820 (AWG) / 51822 (WG) reachable by clients. If an AmneziaWG kernel module
is installed, it must support 3.1; an old module does not fall back to userspace
merely because it rejects new parameters. Upgrade or remove it first.

The admin UI is bound to `127.0.0.1:51821`. For a remote server:

```sh
ssh -L 51821:127.0.0.1:51821 user@server
```

Open http://localhost:51821, finish setup with your public VPN endpoint, create a
client, choose WireGuard or AmneziaWG, and import the downloaded config or QR into the corresponding client app.
The supplied HTTP setting is for this loopback/SSH setup. For public access,
configure HTTPS and set `INSECURE=false` as described in upstream documentation.

## Two protocols

| Protocol      | Default interface               | UDP port | IPv4 subnet |
| ------------- | ------------------------------- | -------- | ----------- |
| AmneziaWG 3.1 | `wg0` (existing name preserved) | 51820    | 10.8.0.0/24 |
| WireGuard     | `wg1`                           | 51822    | 10.9.0.0/24 |

Both interfaces start together, using their kernel implementation when available
or the corresponding userspace implementation otherwise. Client cards show WG or
AWG 3.1. Configuration, hooks and interface admin pages have a protocol selector.
Changing a CIDR only readdresses and restarts that protocol. Subnets cannot overlap.
To change a client's protocol, create a new client and import its new configuration.

`CLASSIC_WG_INTERFACE` changes the classic interface name (default `wg1`).
`CLASSIC_WG_PORT`, `CLASSIC_WG_IPV4_CIDR`, and `CLASSIC_WG_IPV6_CIDR` customize its
initial defaults when the classic interface is first created. The default IPv6
subnet is `fdcc:ad94:bacf:61a5::/112`. Subsequent changes belong in the admin UI;
update Docker port mappings and the exported endpoint port when changing ports.
The classic endpoint initially uses the AWG hostname; it can be changed separately
on its configuration page. `WG_INTERFACE` continues to name the AWG interface.

## Existing installations

Back up the entire `/etc/wireguard` volume before trying this fork. Existing
AWG interface keys, clients and obfuscation settings are preserved. The database migration tags the existing interface as AWG and creates a separate classic interface on startup. Add the new UDP port mapping when upgrading an existing Compose deployment. There is **no automatic
conversion** of an existing WG/AWG tunnel to a new 3.1 profile. For an existing
interface, configure HeaderProtectionKey, S1–S4 (at least 12), RandomTrailers and
other desired parameters in the admin UI, then re-export every client config.
Plain WireGuard clients cannot consume the new profile.

`EXPERIMENTAL_AWG` and `OVERRIDE_AUTO_AWG` no longer select the protocol.
The database and volume paths retain upstream names for compatibility.
Upstream update notifications are disabled in the container because upstream
release images do not contain this fork's defaults.

## Development and validation

```sh
cd src
pnpm install --frozen-lockfile
pnpm test:unit
pnpm typecheck
pnpm build
```

A successful build is not a VPN interoperability test. Before deployment, verify
handshake, routed traffic, DNS, restart persistence, QR/config import, client
revocation and traffic counters with an actual 3.1 client on Linux.

License: AGPL-3.0, inherited from wg-easy; see [LICENSE](LICENSE).

## Integration test

```sh
docker build -t awg-easy:dual .
python3 scripts/test-dual-protocol.py awg-easy:dual
# Optional upgrade check against a locally available prior AWG-only image:
AWG_UPGRADE_FROM=awg-easy:previous python3 scripts/test-dual-protocol.py awg-easy:dual
```

The test creates an isolated Docker network, server, WG/AWG clients and temporary
volume, and removes them afterwards. It checks simultaneous handshakes/traffic,
API edits, exports, statistics, CIDR isolation, restart persistence and revocation.
