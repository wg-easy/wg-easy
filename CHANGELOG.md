# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

We're super excited to announce v15!
This update is an entire rewrite to make it even easier to set up your own VPN.

## Major Changes

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
- Removed ARMv6 and ARMv7 support
- Connections over HTTP require setting the `INSECURE` env var
- Changed license from CC BY-NC-SA 4.0 to AGPL-3.0-only

## [14.0.0] - 2024-09-04

### Major changes

- `PASSWORD` has been replaced by `PASSWORD_HASH`
