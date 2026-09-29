# Validation — 2026-09-29

## Simultaneous WireGuard and AmneziaWG

- 74 unit tests pass, including protocol dispatch, classic config exclusion of
  AWG fields, overlapping subnet rejection and identical-key stat isolation.
- Type checking, ESLint, Compose validation and Linux/arm64 Docker production
  build pass.
- `scripts/test-dual-protocol.py` verifies both protocols connecting and passing
  VPN traffic concurrently, isolated live peers, protocol-specific stats, API
  editing, config and SVG QR export, CIDR changes confined to WG, restart
  persistence/reconnection, and revocation of WG without interrupting AWG.
- Upgrade from the prior AWG-only image preserves the existing AWG server and
  client configs byte-for-byte while provisioning the second interface.
- Browser verification: WG creation selects 10.9.0.2, both WG/AWG badges render,
  and switching admin Interface to WG shows port 51822 without AWG fields.
- The UI review container is separate from integration tests and uses local-only
  HTTP; it is not a production deployment.

The integration test reconnects clients explicitly after restart. Mobile imports,
IPv6 traffic, automatic reconnect latency, internet routing/DNS and amd64 execution
remain unverified locally. CI is configured to run the fresh-install Docker test.

## Previous AWG-only baseline

Based on upstream `5f2009a`.

Passed locally:

- 69 unit tests across 9 files, including new AWG profile and zero-value cases.
- Nuxt type checking and ESLint (no errors or warnings after the import fix).
- Production Nuxt and CLI builds.
- Production Docker build on Docker Desktop Linux/arm64.
- Production and development Compose configuration validation.
- Integration with two isolated containers using bundled AmneziaWG 3.1 userspace:
  initial setup, password login, client creation through API, configuration and
  SVG QR export, successful handshake and 3/3 VPN pings.
- Configuration remained byte-identical after server restart. After explicitly
  reconnecting the client, another 3/3 VPN pings succeeded.
- Deleting the client through the API removed its peer from the live interface.

The initial immediate ping after server restart failed while the client retained
its old session. The successful restart check explicitly restarted the client
interface; automatic recovery time was not measured.

Not yet verified: Linux kernel AWG 3.1, amd64 container execution, mobile/desktop
client imports, IPv6 traffic, internet routing/DNS and upgrades of existing data.
GitHub Actions results are separate from the local checks above.
