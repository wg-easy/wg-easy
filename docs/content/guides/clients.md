---
title: Edit Client
---

## General

- **Name**: The name of the client.
- **Enabled**: Whether the client can connect to the VPN.
- **Expire Date**: The date the client will be disabled.

## Address

- **IPv4**: The IPv4 address of the client.
- **IPv6**: The IPv6 address of the client.

## Allowed IPs

Which IPs will be routed through the VPN.

This will not prevent the user from modifying it locally and accessing IP ranges that they should not be able to access.

Use the Firewall Allowed IPs feature to prevent access to IP ranges that the user should not be able to access.

## Firewall Allowed IPs

!!! note
    This field only appears when **Per-Client Firewall** is enabled in the Admin Panel → Interface settings.

Server-side firewall rules that restrict which destinations the client can access, regardless of their local configuration.

Unlike "Allowed IPs" which only controls routing on the client side, these rules are enforced by the server using iptables/ip6tables and cannot be bypassed by the client.

**Supported Formats:**

- `10.10.0.3` - Allow access to a single IP address
- `10.10.0.0/24` - Allow access to an entire subnet
- `192.168.1.5:443` - Allow access to specific port (TCP+UDP)
- `192.168.1.5:443/tcp` - Allow access to specific port (TCP only)
- `192.168.1.5:443/udp` - Allow access to specific port (UDP only)
- `[2001:db8::1]:443` - IPv6 address with port (brackets required)

**Behavior:**

- **Empty**: Falls back to the client's "Allowed IPs" setting
- **Specified**: Only listed destinations are accessible (allow-only, everything else is blocked)
- **Use Case Examples**:
    - Allow only specific servers: `10.10.0.5`
    - Allow only internal network: `10.10.0.0/24, 192.168.1.0/24`
    - Allow only web browsing: `0.0.0.0/0:80, 0.0.0.0/0:443, ::/0:80, ::/0:443`
    - Block internet, allow LAN: Leave "Allowed IPs" as `0.0.0.0/0, ::/0` but set Firewall IPs to `10.0.0.0/8, 192.168.0.0/16`

## Server Allowed IPs

Which IPs will be routed to the client.

## DNS

The DNS server that the client will use.

## Advanced

- **MTU**: The maximum transmission unit for the client.
- **Persistent Keepalive**: The interval for sending keepalive packets to the server.

## Hooks

This can only be used for clients that use `wg-quick`. Setting this will throw a error when importing the config on other clients.

- **PreUp**: Commands to run before the interface is brought up.
- **PostUp**: Commands to run after the interface is brought up.
- **PreDown**: Commands to run before the interface is brought down.
- **PostDown**: Commands to run after the interface is brought down.

## Actions

- **Save**: Save the changes made in the form.
- **Revert**: Revert the changes made in the form.
- **Delete**: Delete the client.
