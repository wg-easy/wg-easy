---
title: Setup
---

On the first visit to the Web UI, the setup wizard guides you through creating an administrator and configuring the VPN. Select **Continue** on the welcome screen to begin. For automated deployments, see [Unattended Setup](../advanced/config/unattended-setup.md).

## User Setup

- **Username**: Your administrator login name.
- **Password**: Your administrator password, at least 12 characters long.
- **Confirm Password**: Enter the same password again.

Select **Create Account**, then sign in with the username and password you just chose. If you close the browser before finishing setup, sign in again to resume.

If you set `DISABLE_PASSWORD_AUTH=true`, change it to `false` and recreate the container with the updated setting before creating the administrator. After setup, you can switch to [OAuth-only sign-in](../advanced/config/external-authentication.md#disable-password-authentication).

## Existing Setup

After signing in, select **Yes** to import a v14 backup or **No** to configure a fresh installation.

### No - Host Setup

- **Host**: The public hostname or IP address clients will connect to, such as `vpn.example.com`. IPv6 addresses may be entered with or without brackets, for example `2001:db8::1` or `[2001:db8::1]`. Use **Suggest** to choose a detected address or hostname.
- **Port**: The UDP port clients connect to and the server initially listens on. The default is `51820`. Make sure your container port mapping and any router port forwarding match your configuration.

Select **Continue** to finish setup.

### Yes - Migration

Select your v14 `wg0.json` backup and choose **Upload**. See [Migrate from v14 to v15](../advanced/migrate/from-14-to-15.md) for backup and import instructions.

## After Setup

Setup opens the dashboard with your administrator account signed in. From there you can manage imported clients or [create a client](./clients.md#create-a-client). Use the user menu to open the [Admin Panel](./admin.md) or manage your [Account](./account.md), including [two-factor authentication](./2fa.md).
