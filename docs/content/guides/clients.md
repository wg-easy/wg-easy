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
3. Select **Create Client**.
4. Download the configuration or scan the QR code to import it on the device.

New clients receive an available VPN address and generated keys. The [Admin Panel's Config settings](./admin.md#client-configuration) control their defaults.

## Share a Configuration

The buttons on each client card let you:

- **Show QR Code**: Scan the code with a compatible VPN app. The dialog also supports downloading or copying the QR code as a PNG.
- **Download Configuration**: Download the client's configuration file.
- **Generate short one time link**: Display a temporary download link below the card, with a countdown. The link is valid for five minutes. After the first download, it remains available for up to ten seconds to accommodate duplicate browser requests, without exceeding the original expiry. Further downloads do not extend this grace period.

One-time links are intentionally short for manual entry. The current token scheme has only 1,000 possible values per client ID, so links can be guessed. Anyone with an active link can download the complete configuration, including its private key, without signing in. Generate a link when the recipient is ready to use it and share it privately. Authenticated downloads and QR codes are also available.

On the client's edit page, **View Configuration** displays the saved configuration and lets you copy it. Save form changes before viewing or sharing the configuration. Configuration changes are not pushed to devices; import the updated file or QR code on the device when its settings change.

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

Additional IPs and networks the server routes to this client, such as a LAN behind the client. The client's own VPN addresses are included automatically. See the [routed setup guide](../examples/tutorials/routed.md) for an example.

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
- **Rotate Key Pair**: Generate a new private and public key pair immediately after confirmation. The old keys will stop working.
- **View Configuration**: View and copy the current client configuration. After adding, rotating, or removing the preshared key, or rotating the key pair, update the configuration on the client device to reconnect.
- **Delete**: Delete the client.
