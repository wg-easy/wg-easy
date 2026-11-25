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

- **MTU** accepts a whole number up to 9000 bytes. The minimum is 1280 with IPv6 enabled and 1024 for IPv4-only interfaces. Leave it empty for automatic detection. A dual-stack tunnel uses at least 1280 bytes, including when an older configuration has a smaller saved value.
- **Port**: The UDP port on which WireGuard listens. Changing this does not change the public port under **Config**.
- **Device**: The network device used by the default forwarding/NAT hooks, such as `eth0`.
- **Routing Table** accepts `auto`, `off`, or a numeric ID from 0 to 4294967295. Linux interprets IDs with a leading zero as octal.
- **AmneziaWG Obfuscation Parameters**: Server-side AmneziaWG settings, shown when AmneziaWG is active.

**Change CIDR** saves the IPv4 and IPv6 ranges for the next interface start. Until then, clients and configuration downloads use the current ranges. Adding a client requires space in both the current and saved ranges. **Restart Interface** disconnects clients and applies the saved ranges, listen port, device and hooks. Clients keep any address still usable in the new range. After restart, download and distribute a new configuration for each client whose address changed. MTU changes apply when you save.

If the replacement interface fails to start after wg-easy assigns the new addresses, those assignments stay saved. **Restart required** remains visible. Maintenance retries routing and interface setup failures. A failed **PostUp** requires an explicit restart after you check the hook and its effects.

wg-easy automatically restarts the interface when it adds or removes a managed default route for IPv4 or IPv6, or moves a default route to another routing table. All peers briefly disconnect. The new interface runs the saved hooks with the active listen port, device and address ranges. Staged changes stay pending until you select **Restart Interface** or restart the service. Ordinary site routes update live. With **Routing Table** set to `off`, wg-easy leaves route installation to the host.

With **Routing Table** set to `auto`, a peer advertising a default route needs the two rule priorities immediately before the main table lookup. Higher-priority host rules can still route matching traffic outside the tunnel. If host rules occupy either priority when a running interface needs to restart, wg-easy reports a conflict and keeps the current interface and its routing policy active. Peer and firewall updates continue. Maintenance retries the restart after the priorities become available. If a conflict arises during startup itself, wg-easy removes the incomplete interface and retries.

If `PreUp` sets a socket mark, wg-easy uses it. When wg-easy assigns a new mark, it checks the host's IPv4 and IPv6 routing rules, including masked marks. Peer updates keep that mark. If a later host rule conflicts with it, select **Restart Interface** to have wg-easy choose the mark again.

If the userspace WireGuard or AmneziaWG daemon exits, the next maintenance check restarts the tunnel with its active port and address ranges. Connected peers must establish a new handshake.

The address in the CIDR selects the server's gateway address. A network address keeps the first host as the gateway, preserving existing setups: `10.8.0.0/24` uses `10.8.0.1`. To choose another gateway, enter it directly, for example `10.8.0.15/24`. Clients then use available addresses from `10.8.0.1` through `10.8.0.254`, excluding `10.8.0.15`. The same rule applies to IPv6 and unattended setup CIDRs. The network and last address remain reserved for both address families.

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
- **PostUp** runs after wg-easy installs the default routes and attempts the site routes. After the hook, wg-easy checks site routes again. Maintenance retries any remaining site-route conflicts.
- **PreDown**: Before the interface stops.
- **PostDown**: After the interface stops.

When upgrading from a version that used wg-quick on the server, check multiline hooks. The server now preserves line breaks. Keep a command and its arguments on one line or end each continued line with a backslash (`\`). A shell comment ends at the next line break.

If your deployment keeps its network namespace during an upgrade or rollback, stop the running version and verify its interface is gone before starting the other version. This lets the original manager run its down hooks and remove its routes and firewall rules. The native tunnel manager uses Linux interface alternate names to identify the link it owns.

If startup reports `Cannot verify ownership of unfinished tunnel`, inspect the temporary link named in the error in the same network namespace. A crash can leave a new link without its generation tag. If you can verify that it belongs to the interrupted startup, remove it and restart wg-easy. If another service owns the link, coordinate with its operator to free the temporary name.

If **PostUp** fails or the process stops before wg-easy can record its success, wg-easy takes the tunnel down and keeps the admin panel available. Replacing the container with the same `/etc/wireguard` volume preserves this state. Inspect the hook's external effects and undo any partial changes, correct the hook under **Admin Panel → Hooks**, then select **Restart Interface** under **Interface**. Once success and the down hooks are saved together, crash recovery runs the recorded teardown.

If **PreDown** or **PostDown** fails or is interrupted during teardown, wg-easy keeps the panel available for repair. Inspect the hook's effects before selecting **Restart Interface**. Recovery runs each saved down hook at most once. If both hooks failed or may have been interrupted, the recovery marker names both.

If recovery cannot write the marker before a down hook starts, wg-easy takes the owned link offline and leaves the hook pending. The admin panel stays available. Restore write access to the recovery volume. Maintenance or **Restart Interface** then resumes teardown and runs the pending hook.

If the journal is unreadable at boot, the admin panel remains available while VPN operations wait. Repair the volume and its private recovery files. wg-easy validates the saved generation before resuming.

The default hooks set up forwarding and NAT. Templates can use `{{ipv4Cidr}}`, `{{ipv6Cidr}}`, `{{device}}`, `{{interface}}`, `{{port}}`, and `{{uiPort}}`, which are replaced with the current server settings. CIDR placeholders use the network address, so `10.8.0.15/24` becomes `10.8.0.0/24` in hooks. Saved hooks run at the corresponding interface lifecycle event. Hooks on an individual client's page instead run on that client device.
