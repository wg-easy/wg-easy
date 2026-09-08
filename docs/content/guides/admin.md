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

wg-easy uses nftables named quotas when the container has `NET_ADMIN` capability and the host kernel supports the `nft_quota` module. The container image includes the `nft` command, but installing that command does not add missing kernel support.

On hosts where `CONFIG_NFT_QUOTA=m`, load the module before starting wg-easy:

```shell
sudo modprobe nft_quota
echo nft_quota | sudo tee /etc/modules-load.d/nft-quota.conf
```

On Ubuntu, install the matching optional kernel modules if `modprobe` reports that `nft_quota` is not available:

```shell
sudo apt update
sudo apt install linux-modules-extra-$(uname -r)
sudo modprobe nft_quota
```

Restart the wg-easy container after loading the module because the enforcement backend is detected and cached for the lifetime of the server process. When nftables enforcement is active, the following command lists its rules:

```shell
docker exec <container-name> nft list table inet wg_easy_quota
```

The packet that crosses the limit is allowed through so WireGuard can persist the exceeded state; subsequent traffic is blocked. Small amounts of in-flight traffic may also pass before blocking takes effect.

If the kernel probe or ruleset installation fails, wg-easy falls back to WireGuard counter polling every 10 seconds. Traffic can continue until the next poll, so the amount over the configured limit depends on transfer speed. Some VM-based container runtimes, including Docker Desktop installations whose LinuxKit kernel lacks nftables quota support, use this fallback even though the `nft` command is installed.

Quota state and usage are included in the JSON and Prometheus metrics endpoints. The Prometheus quota labels use stable quota IDs and a fixed set of direction/state values to limit label cardinality.
