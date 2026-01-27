---
title: Admin Panel
---

## Interface Settings

### Per-Client Firewall

Enable server-side firewall filtering to enforce network access restrictions per client.

When enabled, each client can have custom "Firewall Allowed IPs" configured that restrict which destinations they can access through the VPN. These restrictions are enforced by the server using iptables/ip6tables and cannot be bypassed by the client.

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

See [Edit Client → Firewall Allowed IPs](../clients/#firewall-allowed-ips) for detailed configuration syntax and examples.
