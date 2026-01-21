# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [15.2.1] - 2026-01-14

### Fixed

- Icon in Searchbar (https://github.com/wg-easy/wg-easy/commit/458f66818a400f181e2c6326ede077c8793d71f2)
- Interface save not working (https://github.com/wg-easy/wg-easy/commit/48f3fbd715a889e2425702a8a46332f2752aef91)
- Error Messages in Setup (https://github.com/wg-easy/wg-easy/commit/32a055093a76342c40858d8dcf563b0700a8bd48)

## [15.2.0] - 2026-01-12

### Added

- AmneziaWG integration (https://github.com/wg-easy/wg-easy/pull/2102, https://github.com/wg-easy/wg-easy/pull/2226)
- Search / filter box (https://github.com/wg-easy/wg-easy/pull/2170)
- `INIT_ALLOWED_IPS` env var (https://github.com/wg-easy/wg-easy/pull/2164)
- Show client endpoint (https://github.com/wg-easy/wg-easy/pull/2058)
- Add option to view and copy config (https://github.com/wg-easy/wg-easy/pull/2289)

### Fixed

- Fix download as conf.txt (https://github.com/wg-easy/wg-easy/pull/2269)
- Clean filename for OTL download (https://github.com/wg-easy/wg-easy/pull/2253)
- Text color in admin menu in light mode (https://github.com/wg-easy/wg-easy/pull/2307)

### Changed

- Allow lower MTU (https://github.com/wg-easy/wg-easy/pull/2228)
- Use /32 and /128 for client Cidr (https://github.com/wg-easy/wg-easy/pull/2217)
- Return client id on create (https://github.com/wg-easy/wg-easy/pull/2190)
- Publish on Codeberg (https://github.com/wg-easy/wg-easy/pull/2160)
- Allow empty DNS (https://github.com/wg-easy/wg-easy/pull/2052, https://github.com/wg-easy/wg-easy/pull/2057)
- Don't include keys in API responses (https://github.com/wg-easy/wg-easy/pull/2015)
- Try all QR ecc levels (https://github.com/wg-easy/wg-easy/pull/2288)
- Update OneTimeLink expiry on reuse (https://github.com/wg-easy/wg-easy/pull/2370)
- Removed ARMv7 support (https://github.com/wg-easy/wg-easy/pull/2369)

### Docs

- Add AdGuard Home (https://github.com/wg-easy/wg-easy/pull/2175)
- Add Routed (No NAT) docs (https://github.com/wg-easy/wg-easy/pull/2181, https://github.com/wg-easy/wg-easy/pull/2380)
- Add AmneziaWG docs (https://github.com/wg-easy/wg-easy/pull/2108, https://github.com/wg-easy/wg-easy/pull/2292)

## [15.1.0] - 2025-07-01

### Added

- Added Ukrainian language (#1906)
- Add French language (#1924)
- docs for caddy example (#1939)
- add docs on how to add/update translation (be26db6)
- Add german translations (#1889)
- feat: Add Traditional Chinese (zh-HK) i18n Support (#1988)
- Add Chinese Simplified (#1990)
- Add option to disable ipv6 (#1951)

### Fixed

- Updated container launch commands (#1989)
- update screenshot (962bfa2)

### Changed

- Updated dependencies

## [15.0.0] - 2025-05-28

We're super excited to announce v15!
This update is an entire rewrite to make it even easier to set up your own VPN.

### Breaking Changes

As the whole setup has changed, we recommend to start from scratch. And import your existing configs.

### Major Changes

- Almost all Environment variables removed
- New and Improved UI
- API Basic Authentication
- Added Docs
- Incrementing Version -> Semantic Versioning
- CIDR Support
- IPv6 Support
- Changed API Structure
- SQLite Database
- Deprecated Dockerless Installations
- Added Docker Volume Mount (`/lib/modules`)
- Removed ARMv6 support
- Connections over HTTP require setting the `INSECURE` env var
- Changed license from CC BY-NC-SA 4.0 to AGPL-3.0-only
- Added 2FA using TOTP
- Improved mobile support
- CLI
- Replaced `nightly` with `edge`

## [14.0.0] - 2024-09-04

### Major changes

- `PASSWORD` has been replaced by `PASSWORD_HASH`
