# Validation — 2026-09-29

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
