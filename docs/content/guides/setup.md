---
title: Setup
---

On the first visit to the Web UI, the setup wizard guides you through creating an administrator and configuring the VPN. Select **Continue** on the welcome screen to begin. For automated deployments, see [Unattended Setup](../advanced/config/unattended-setup.md).

## User Setup

- **Username**: Your administrator login name, at least two characters long.
- **Password**: Your administrator password, at least 12 characters long.
- **Confirm Password**: Enter the same password again.

Select **Create Account** to continue.

## Existing Setup

If you have the config from the previous version, you can import it by clicking "Yes". This currently expects a config from v14.

If this is the first time you are using this, you can click "No" to create a new config.

### No - Host Setup

- **Host**: The public hostname or IP address clients will connect to, such as `vpn.example.com`. IPv6 addresses may be entered with or without brackets, for example `2001:db8::1` or `[2001:db8::1]`. Use **Suggest** to choose a detected address or hostname.
- **Port**: The UDP port clients connect to and the server initially listens on. The default is `51820`. Make sure your container port mapping and any router port forwarding match your configuration.

Select **Continue** to finish setup.

### Yes - Migration

Select the `wg0.json` file from the previous version. Read [Migrate from v14 to v15](../advanced/migrate/from-14-to-15.md) for more information.

## After Setup

Sign in and [create your first client](./clients.md#create-a-client). Use the user menu to open the [Admin Panel](./admin.md) or manage your [Account](./account.md), including [two-factor authentication](./2fa.md).
