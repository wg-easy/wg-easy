# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
