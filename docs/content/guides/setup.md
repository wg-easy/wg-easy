---
title: Setup
---

## User Setup

- **Username**: The username of the user.
- **Password**: The password of the user.
- **Confirm Password**: The password of the user.

## Existing Setup

If you have the config from the previous version, you can import it by clicking "Yes". This currently expects a config from v14.

If this is the first time you are using this, you can click "No" to create a new config.

### No - Host Setup

- **Host**: The host of the server. The clients will connect to this address. This can be a domain name or an IP address. Make sure to wrap it in brackets if it is an IPv6 address. For example: `[::1]` or `[2001:db8::1]`.
- **Port**: The port of the server. The clients will connect to this port. The server will listen on this port.

### Yes - Migration

Select the `wg0.json` file from the previous version. Read [Migrate from v14 to v15](../advanced/migrate/from-14-to-15.md) for more information.
