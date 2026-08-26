---
title: Admin Panel
---

## Interface Settings

### Per-Client Firewall

Enable server-side firewall filtering to enforce network access restrictions per client.

When enabled, each client can have custom "Firewall Allowed IPs" configured that restrict which destinations they can access through the VPN. These restrictions are enforced by the server using iptables/ip6tables and cannot be bypassed by the client.

/// warning | Experimental Feature

This feature is currently experimental. While functional, it should be thoroughly tested in your environment before relying on it for production security requirements. Always verify that firewall rules are working as expected using test traffic or by manually inspecting the rules.

///

**Requirements:**

- `iptables` must be installed on the host system
- `ip6tables` must be installed if IPv6 is enabled (default)
- The feature cannot be enabled if these tools are not available

/// note

Most Linux distributions include iptables by default. If you're running in a minimal container environment, you may need to install the `iptables` package on the host system.

///

**Enable this feature if you want to:**

- Restrict certain clients to only access specific servers or networks
- Prevent clients from accessing the internet while allowing LAN access
- Enforce port-based restrictions (e.g., only allow HTTP/HTTPS)
- Separate routing configuration from security enforcement

**How it works:**

1. Enable "Per-Client Firewall" in Admin Panel → Interface
2. Edit any client to see the new "Firewall Allowed IPs" field
3. Specify allowed destinations (IPs, subnets, ports) for that client
4. Server enforces these rules automatically

See [Edit Client → Firewall Allowed IPs](./clients.md#firewall-allowed-ips) for detailed configuration syntax and examples.

## Client Quotas

The **Admin Panel → Quotas** page manages traffic quotas that can be assigned to one or more clients. A client can belong to one quota, while a quota can be shared by any number of clients. Usage from every assigned client contributes to the shared total.

Quota modes use WireGuard interface counter directions:

- **RX only:** bytes received by the server from assigned clients
- **TX only:** bytes sent by the server to assigned clients
- **RX + TX:** one combined limit shared by both directions
- **Separate RX / TX:** independent limits; reaching either limit blocks every assigned client

When an enabled quota is exceeded, all assigned clients are temporarily blocked. Their individual **Enabled** settings are preserved and eligible clients reconnect after the quota is reset. Disabling quota enforcement does not stop usage accounting.

### Reset schedules

Automatic resets are optional. Daily, weekly, and monthly schedules run at the configured local time in the selected IANA timezone. Monthly days that do not exist in a shorter month are clamped to that month's final day. Administrators can also reset current usage manually from the quota list.

Changing a quota preserves its current usage and immediately reevaluates the new limit. Deleting a quota does not delete clients; it removes their assignment.

### Enforcement backend

wg-easy uses nftables named quotas when the host kernel and `nft` command support them. This blocks traffic at the exact limit. Otherwise, wg-easy falls back to WireGuard counter polling every 10 seconds, so traffic may continue briefly after crossing a limit.

Quota state and usage are included in the JSON and Prometheus metrics endpoints. The Prometheus quota labels use stable quota IDs and a fixed set of direction/state values to limit label cardinality.
