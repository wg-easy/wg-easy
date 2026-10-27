---
title: Admin Panel
---

Open the user menu in the top-right corner and select **Admin Panel**. Choose **General**, **Config**, **Interface**, or **Hooks** in the sidebar. Use **Save** to apply form changes and **Revert** to discard unsaved changes.

## General Settings

- **Session Timeout**: Duration in seconds for the login cookie when **Remember me** is selected.
- **Metrics → Password**: Optional bearer password shared by the metrics endpoints. Enter a password or an Argon2 hash. Requests must send the original password as `Authorization: Bearer <password>`. Leaving this empty allows access without authentication when an endpoint is enabled.
- **Prometheus**: Enable `/metrics/prometheus`. See the [Prometheus guide](../advanced/metrics/prometheus.md) for a scrape configuration.
- **JSON**: Enable `/metrics/json` for peer counts and per-client connection and traffic statistics.

## Client Configuration

**Config** controls the connection details and defaults used in generated client configurations.

### Connection

- **Host**: The public hostname or IP address clients connect to. **Suggest** offers detected addresses and a hostname to choose from. IPv6 addresses work with or without brackets; generated endpoints include the required brackets.
- **Port**: The public UDP port clients connect to. This is separate from the listening port under **Interface**. Keep both ports and any Docker port mapping or router forwarding consistent with your setup.

After changing the host or port, distribute updated configurations to existing devices.

### Allowed IPs and DNS

These lists are used by clients that have no per-client override. Changes affect subsequently generated configurations for those clients, including existing clients. Devices need to import the updated configuration to use the new values.

Use one entry per row. **Add** creates an entry, the remove button deletes it, and the up/down arrows reorder entries. Allowed IPs controls routing in the client configuration; use [Per-Client Firewall](#per-client-firewall) to enforce destination restrictions on the server.

### Advanced

These defaults only affect newly created clients:

- **Generate Preshared Keys**: Enabled by default. Disable it to create clients without a preshared key. Existing keys remain unchanged; individual clients still support adding, rotating, or removing a preshared key.
- **MTU**: The maximum transmission unit written to the client configuration. Leave empty for automatic detection.
- **Persistent Keepalive**: The keepalive interval in seconds. Set to `0` to disable keepalives.

When AmneziaWG is active, **Config** also provides default obfuscation parameters for new clients. See [AmneziaWG](../advanced/config/amnezia.md) for details.

## Interface Settings

**Interface** controls the server's VPN interface:

- **MTU**: The server interface's maximum transmission unit. Leave empty for automatic detection.
- **Port**: The UDP port on which WireGuard listens. Changing this does not change the public port under **Config**.
- **Device**: The network device used by the default forwarding/NAT hooks, such as `eth0`.
- **Routing Table**: `auto`, `off`, or a routing table number.
- **AmneziaWG Obfuscation Parameters**: Server-side AmneziaWG settings, shown when AmneziaWG is active.

**Change CIDR** updates the VPN address ranges, preserves client addresses that remain usable, and reassigns addresses that fall outside the new pool or become reserved. Distribute updated configurations to clients whose addresses changed. **Restart Interface** brings the interface down and back up, disconnecting all clients. Restart after changes to settings applied by `wg-quick`, such as interface addresses, MTU, routing table, or hooks.

### Per-Client Firewall

Enable server-side firewall filtering to enforce network access restrictions per client.

When enabled, each client can have custom "Firewall Allowed IPs" configured that restrict which destinations they can access through the VPN. These restrictions are enforced by the server using iptables/ip6tables and cannot be bypassed by the client.

/// warning | Experimental Feature

This feature is currently experimental. While functional, it should be thoroughly tested in your environment before relying on it for production security requirements. Always verify that firewall rules are working as expected using test traffic or by manually inspecting the rules.

///

**Requirements:**

- The host kernel must provide the firewall support required by `iptables`, either built in or through loaded kernel modules
- IPv6 firewall support is also required when IPv6 is enabled (default)

**Enable this feature if you want to:**

- Restrict certain clients to only access specific servers or networks
- Prevent clients from accessing the internet while allowing LAN access
- Enforce port-based restrictions (e.g., only allow HTTP/HTTPS)
- Separate routing configuration from security enforcement

**How it works:**

1. Turn on **Enable Per-Client Firewall** in **Admin Panel → Interface → Traffic Filtering** and select **Save**
2. Edit any client to see the new "Firewall Allowed IPs" field
3. Specify allowed destinations (IPs, subnets, ports) for that client
4. Server enforces these rules automatically

See [Clients → Firewall Allowed IPs](./clients.md#firewall-allowed-ips) for detailed configuration syntax and examples.

Filtering covers forwarded traffic and traffic addressed to the VPN server itself. Traffic may pause briefly while rules are rebuilt. If a rebuild fails, blocking rules remain in place until a successful retry or until filtering is explicitly disabled.

## Hooks

**Hooks** configures commands run on the server when the VPN interface starts or stops:

- **PreUp**: Before the interface starts.
- **PostUp**: After the interface starts.
- **PreDown**: Before the interface stops.
- **PostDown**: After the interface stops.

The default hooks set up forwarding and NAT. Templates can use `{{ipv4Cidr}}`, `{{ipv6Cidr}}`, `{{device}}`, `{{interface}}`, `{{port}}`, and `{{uiPort}}`, which are replaced with the current server settings. Saved hooks run at the corresponding interface lifecycle event. Hooks on an individual client's page instead run on that client device.
