# AWG Easy

Fork of [wg-easy](https://github.com/wg-easy/wg-easy) for AmneziaWG 3.1.
Based on upstream commit `5f2009a`. Upstream UI, authentication, client management,
QR export and database migrations are retained. Original documentation is in
[README.upstream.md](README.upstream.md); this file describes the fork's defaults.

## What changes

- Always uses `awg` / `awg-quick`; never silently falls back to plain WireGuard.
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
Compose network, and UDP 51820 reachable by clients. If an AmneziaWG kernel module
is installed, it must support 3.1; an old module does not fall back to userspace
merely because it rejects new parameters. Upgrade or remove it first.

The admin UI is bound to `127.0.0.1:51821`. For a remote server:

```sh
ssh -L 51821:127.0.0.1:51821 user@server
```

Open http://localhost:51821, finish setup with your public VPN endpoint, create a
client and import the downloaded config or QR into an AmneziaWG 3.1-capable client.
The supplied HTTP setting is for this loopback/SSH setup. For public access,
configure HTTPS and set `INSECURE=false` as described in upstream documentation.

## Existing installations

Back up the entire `/etc/wireguard` volume before trying this fork. Existing
interface keys and obfuscation settings are preserved. There is **no automatic
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
