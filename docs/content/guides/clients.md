---
title: Clients
---

The **Clients** page is the home page after signing in. It lets you create devices, monitor their connections, share configurations, and manage VPN access.

## Client List

Each client card shows its name, VPN address, connection status, last handshake, expiration, and upload/download statistics. Use the chart button in the header to show or hide traffic charts. The list updates automatically.

- **Enabled** means the client is allowed to connect. The switch on the card saves immediately.
- **Online** means an enabled client has completed a handshake within the last 10 minutes. This is based on handshake activity, not a continuous connectivity check.
- **Offline** means an enabled client has no handshake within that window. Disabled clients have a separate status.

### Search, Filter, and Sort

- **Search clients** matches names, IPv4 addresses, and IPv6 addresses across the whole list.
- **Status** filters by enabled, disabled, online, or offline clients.
- **Expiry** filters by **Never expires**, **Expires in 7 days**, or **Expired**. The seven-day filter includes future expirations within the next seven days.
- **Sort by** orders clients by name, creation time, IPv4 address, or expiration in either direction. Clients without an expiration appear last when sorting by expiry.
- **Clear filters** resets the search, status, and expiry filters.

Use **Previous** and **Next** below the list to move between pages. **Per page** offers 10, 25, 50, or 100 clients; the default is 25. Changing a search, filter, sort order, or page size returns to the first page. The count reflects the clients matching your search and filters.

## Create a Client

1. Select **New Client**.
2. Enter a **Name** and, optionally, an **Expires At** date and time in your local timezone. Leave the expiration empty for permanent access.
3. By default, wg-easy generates a WireGuard key pair. To use a key pair generated on the device, expand **Advanced** and paste the device's **Public Key**. Keep the private key on the device.
4. Select **Create Client**.

wg-easy assigns the client an available VPN address. The [Admin Panel's Config settings](./admin.md#client-configuration) control its defaults.

## Share a Configuration

Use the buttons on the client card to set up the device. The available options depend on where the private key is stored.

- If **wg-easy manages the key**, select **Download Configuration** to import the `.conf` file, or **Show QR Code** to scan it with a compatible VPN app. You can also download or copy the QR code as a PNG.
- If **the device holds the key**, select **Download configuration template**. On the device, open the `.template.conf` file, uncomment the `PrivateKey` line under `[Interface]`, and replace `<device private key>` with the matching private key. Save and import the completed file. If the key is already in the VPN app, you can copy the settings from the template into that tunnel.

On the client's edit page, **View Configuration** or **View configuration template** lets you copy the saved settings. After changing settings in wg-easy, save them and apply them on the device.

### One-time links

Select **Generate short one time link** to share the configuration or template. The link appears below the card with a countdown. New links use eight random letters and digits and are case-sensitive.

Anyone with the link can download the file without signing in. A full configuration includes the client's private key, and both files include the preshared key if one is configured. Share the link privately. It expires after five minutes or ten seconds after the first download, whichever comes first. Repeat downloads do not extend it.

## Bulk Actions

1. Select **Bulk actions** above the client list.
2. Select individual clients or use **Select this page** to select all clients on the current page.
3. Open the **Bulk actions** menu and choose **Enable selected**, **Disable selected**, or **Delete selected**.
4. Confirm the action in the dialog.

Selection applies only to the current page. Changing the page, search, filters, sort order, or page size clears it. **Clear selection** clears the checkboxes, and **Done selecting** leaves selection mode.

Expired clients must have their expiration removed or moved into the future before they can be enabled. If any selected client is expired, the bulk enable action is rejected for the whole selection.

Disabling clients removes VPN access but keeps their configuration for later use. Deleting clients permanently removes their saved configurations and one-time links; it cannot be undone.

## Edit a Client

Select a client's name or edit button to open its settings. Use **Save** to apply form changes or **Revert** to reload the saved values.

List fields use one entry per row. Use **Add**, the remove button, and the up/down arrows to add, remove, or reorder entries.

### General

- **Name**: The name of the client.
- **Enabled**: Whether the client can connect to the VPN.
- **Expires At**: The date and time the client will be disabled, shown and entered in your local timezone. Leave empty for permanent access. Existing date-only values remain supported and keep their original midnight-UTC expiration.

### Keys

- **Public Key**: The client's public key. Select the text to copy it.
- **Preshared Key**: Whether the client has a preshared key configured.

### Address

- **IPv4**: The IPv4 address of the client.
- **IPv6**: The IPv6 address of the client.
- **Endpoint**: The most recently observed address and port from which the client connected. This is read-only.

Client addresses must be within the interface's configured CIDRs and must not use reserved addresses or an address assigned to another client. IPv6 addresses are normalized when saved, so alternate spellings cannot bypass the duplicate-address check.

### Allowed IPs

The destination IPs and networks routed through the VPN by the client's configuration. Leave the list empty to use **Admin Panel → Config → Allowed IPs**. Adding entries overrides that global list for this client.

This will not prevent the user from modifying it locally and accessing IP ranges that they should not be able to access.

Use the Firewall Allowed IPs feature to prevent access to IP ranges that the user should not be able to access.

### Firewall Allowed IPs

/// note | Attention

This field only appears when **Per-Client Firewall** is enabled in the Admin Panel → Interface settings.

///

Server-side firewall rules that restrict which destinations the client can access, regardless of their local configuration.

Unlike "Allowed IPs" which only controls routing on the client side, these rules are enforced by the server using iptables/ip6tables and cannot be bypassed by the client.

**Supported Formats:**

- `10.10.0.3`, `2001:db8::1` - Allow access to a single IP address
- `10.10.0.0/24`, `2001:db8::/32` - Allow access to an entire subnet
- `192.168.1.5:443` - Allow access to specific port (TCP+UDP)
- `192.168.1.5:443/tcp` - Allow access to specific port (TCP only)
- `192.168.1.5:443/udp` - Allow access to specific port (UDP only)
- `10.10.0.0/24:443` - Allow access to an entire subnet on a specific port (TCP+UDP)
- `10.10.0.0/24:443/tcp` - Allow access to an entire subnet on a specific port (TCP only)
- `10.10.0.0/24:443/udp` - Allow access to an entire subnet on a specific port (UDP only)
- `[2001:db8::1]:443` - IPv6 address with port (brackets required)
- `[2001:db8::/32]:443/tcp` - IPv6 CIDR with port and protocol

/// warning | Invalid Formats

Protocol specifiers (`/tcp` or `/udp`) require a port number. The following formats are **not supported** and will result in an error:

- `10.10.0.3/tcp` (use `10.10.0.3:443/tcp` instead)
- `10.10.0.0/24/udp` (use `10.10.0.0/24:53/udp` instead)

///

**Behavior:**

- **Empty**: Falls back to the client's "Allowed IPs" setting, or the global Allowed IPs if the client has no override
- **Specified**: Only listed destinations are accessible (allow-only, everything else is blocked)
- **Allow all destinations for a specific client**: Add `0.0.0.0/0` and `::/0` as separate entries

/// note

To allow clients to reach the VPN server itself (e.g. for DNS), include the server's VPN address in the firewall allowed IPs.

///

**Use Case Examples**:

Enter each comma-separated value below as a separate row in the form.

- Allow only specific servers: `10.10.0.5`
- Allow only internal network: `10.10.0.0/24, 192.168.1.0/24`
- Allow only web browsing: `0.0.0.0/0:80, 0.0.0.0/0:443, [::/0]:80, [::/0]:443`
- Block internet, allow LAN: Leave "Allowed IPs" as `0.0.0.0/0, ::/0` but set Firewall IPs to `10.0.0.0/8, 192.168.0.0/16`

### Server Allowed IPs

Additional IPs and networks the server routes to this client, such as a LAN behind the client. The client's own VPN addresses are included automatically. Adding the first or withdrawing the last enabled gateway for `0.0.0.0/0` or `::/0` automatically restarts the server interface when wg-easy manages routes. This also applies when a gateway is enabled, disabled, deleted, or expires. See the [routed setup guide](../examples/tutorials/routed.md) for an example.

### DNS

The DNS servers included in the client's configuration. Leave the list empty to use **Admin Panel → Config → DNS**, or add entries to override the global list. The up/down arrows change their order in the generated configuration.

### Advanced

- **MTU**: The maximum transmission unit for the client. Leave empty to use automatic MTU detection.
- **Persistent Keepalive**: The interval in seconds for sending keepalive packets to the server. Set to `0` to disable keepalives.

### AmneziaWG

When AmneziaWG is active, an **AmneziaWG Obfuscation Parameters** section provides per-client settings. Parameters that must match the server are copied into the configuration automatically. See [AmneziaWG](../advanced/config/amnezia.md) for supported parameters and compatibility requirements.

### Hooks

These commands are included in the client configuration and run on the client device. They are for clients using `wg-quick`; leave them empty for apps that do not support hooks.

- **PreUp**: Commands to run before the interface is brought up.
- **PostUp**: Commands to run after the interface is brought up.
- **PreDown**: Commands to run before the interface is brought down.
- **PostDown**: Commands to run after the interface is brought down.

### Actions

- **Save**: Save the changes made in the form.
- **Revert**: Revert the changes made in the form.
- **Add Preshared Key**: Generate a preshared key when none is configured, immediately after confirmation.
- **Rotate Preshared Key**: Replace the existing preshared key with a newly generated key immediately after confirmation.
- **Remove Preshared Key**: Remove the client's preshared key immediately after confirmation.
- **Delete**: Delete the client.

After changing the preshared key, update the configuration on the device to reconnect.

#### Change the client's key pair

- **Rotate Key Pair** generates a new key pair in wg-easy. Import the new configuration on the device to reconnect.
- **Replace Public Key** is available when the device holds the private key. Generate a new key pair on the device and enter its public key in wg-easy. Once confirmed, only the new key pair can connect as this client.

#### Switch where the private key is stored

- **Use Device Key** removes the client's private key from wg-easy. To keep the current tunnel connected, make sure the device already has the private key and leave the prefilled public key as it is. To switch to a new key pair generated on the device, enter its public key instead.
- **Manage Key in wg-easy** generates a fresh key pair. Import the new configuration or scan its QR code to reconnect.

Both switches take effect on confirmation and revoke the client's active one-time link. The client keeps its VPN addresses, preshared key, and other settings.
