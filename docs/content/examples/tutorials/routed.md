---
title: Routed setup (No NAT)
---

This guide shows how to run **wg-easy** with a routed setup, so packets are forwarded instead of NATed.

In a routed design, each WireGuard client keeps its own IPv4/IPv6 address. That means you can identify clients by their real addresses instead of seeing everything as the WireGuard server’s IP.

## Requirements

1. You know how to add static routes on your router to the WireGuard server.

## Docker setup

To make use of our own IPv4/IPv6 addresses, run the container with the `network_mode: host` option.

```yaml
services:
    wg-easy:
        image: ghcr.io/wg-easy/wg-easy:15
        container_name: wg-easy
        network_mode: 'host'
        volumes:
            - ./config:/etc/wireguard
            - /lib/modules:/lib/modules:ro
        cap_add:
            - NET_ADMIN
            - SYS_MODULE
        devices:
            - /dev/net/tun:/dev/net/tun
        restart: unless-stopped
```

Because we’re on the host network, remove any `ports:` and container `sysctls:` you might have had before.

## Kernel parameters (on the host)

With host networking, system sysctls must be set on the **host**. On your host, create `/etc/sysctl.d/90-wireguard.conf`:

```txt
net.ipv4.ip_forward=1
net.ipv4.conf.all.src_valid_mark=1
net.ipv6.conf.all.disable_ipv6=0
net.ipv6.conf.all.forwarding=1
net.ipv6.conf.default.forwarding=1
```

Apply and verify:

```shell
sysctl -p /etc/sysctl.d/90-wireguard.conf
sysctl -n net.ipv4.ip_forward   # should print 1
```

## Add static routes on your router

Pick an IPv4 and IPv6 subnet for your clients and add static routes on your router, pointing to the WireGuard server's LAN addresses.

### Example

/// note | 2001:db8::/32

The _documentation prefix_ `2001:db8::/32` (RFC 3849) used in this example is not meant for production use, replace it with your own ISP-assigned IPv6 prefix (GUA) or local prefix (ULA)
///

I want my WireGuard clients in `192.168.0.0/24` and `2001:db8:abc:0::/64`.

- Routed IPv4 subnet: `192.168.0.0/24`
- Routed IPv6 prefix: `2001:db8:abc:0::/64`
- WireGuard server IPs: `192.168.10.118` and `2001:db8:abc:10:216:3eff:fedb:949e`

On your router:

- Route `192.168.0.0/24` → next hop `192.168.10.118`
- Route `2001:db8:abc:0::/64` → next hop `2001:db8:abc:10:216:3eff:fedb:949e`

Don't forget to create the necessary firewall rules to allow these subnets to travel across your LAN. Some routers or servers may require specific Outbound NAT rules for the chosen IPv4 and IPv6 subnets to allow traffic to traverse your LAN.

## `wg-easy` configuration

In the Web UI → Admin → Interface, click Change CIDR and set the IPv4/IPv6 routed subnets you chose above. Save.

Then go to Admin → Hooks and add:

PostUp

```shell
iptables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT
```

PostDown

```shell
iptables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -D FORWARD -o wg0 -j ACCEPT
```
