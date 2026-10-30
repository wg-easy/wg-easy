---
title: Non-root container
---

By default `wg-easy` runs as root inside the container. This guide runs it as an unprivileged user that holds only `NET_ADMIN` and `NET_RAW`, on a read-only root filesystem.

## Requirements

1. The `wireguard` kernel module is loaded on the host, because the container has no `SYS_MODULE`. Add `wireguard` to `/etc/modules-load.d/wireguard.conf` to load it at boot.
2. The host supports legacy iptables, which the default hooks use. Otherwise, see [Hooks and firewall](#hooks-and-firewall).

## Prepare the volume

The volume must belong to the user the container runs as, `1000:1000` in this guide. Before the first start, create the volume and give it to that user:

```shell
docker volume create wg-easy
docker run --rm --mount type=volume,src=wg-easy,dst=/etc/wireguard,volume-nocopy alpine chown 1000:1000 /etc/wireguard
```

The volume is mounted with `nocopy`, here and in the compose file. Without it, Docker copies the image's root-owned `/etc/wireguard` into the empty volume, and the volume belongs to root again.

To move an existing installation, stop it and run the `chown` command with `-R` on its volume.

A bind mount works too if its directory belongs to the user, and does not need `nocopy`.

## Docker Compose

<!-- ref: major version -->

```yaml
volumes:
    etc_wireguard:
        name: wg-easy
        external: true

services:
    wg-easy:
        image: ghcr.io/wg-easy/wg-easy:15
        container_name: wg-easy
        user: '1000:1000'
        environment:
            - XTABLES_LOCKFILE=/tmp/xtables.lock
        networks:
            wg:
                ipv4_address: 10.42.42.42
                ipv6_address: fdcc:ad94:bacf:61a3::2a
        volumes:
            - type: volume
              source: etc_wireguard
              target: /etc/wireguard
              volume:
                  nocopy: true
        ports:
            - '51820:51820/udp'
            - '51821:51821/tcp'
        restart: unless-stopped
        cap_drop:
            - ALL
        cap_add:
            - NET_ADMIN
            - NET_RAW
        security_opt:
            - no-new-privileges:true
        read_only: true
        tmpfs:
            - /tmp
        sysctls:
            - net.ipv4.ip_forward=1
            - net.ipv4.conf.all.src_valid_mark=1
            - net.ipv6.conf.all.disable_ipv6=0
            - net.ipv6.conf.all.forwarding=1
            - net.ipv6.conf.default.forwarding=1

networks:
    wg:
        driver: bridge
        enable_ipv6: true
        ipam:
            driver: default
            config:
                - subnet: 10.42.42.0/24
                - subnet: fdcc:ad94:bacf:61a3::/64
```

The image starts `wg-easy` and its healthcheck through `/usr/local/bin/ambient-caps`. A non-root process loses its capabilities when it runs another program, and `ambient-caps` keeps `NET_ADMIN` and `NET_RAW` for every program after it, such as `wg-quick`. It keeps only the capabilities the container grants.

`docker exec` does not start through it, so a plain `docker exec wg-easy wg show` fails with `Operation not permitted`. Run `wg` through it instead:

```shell
docker exec wg-easy ambient-caps wg show
```

## Hooks and firewall

The default PostUp and PostDown hooks and the per-client firewall call `iptables`, which needs `NET_RAW` as well as `NET_ADMIN`. `iptables` also needs a lock file it can write, and `XTABLES_LOCKFILE` moves it from the read-only `/run` to `/tmp`.

When the hooks are empty and the per-client firewall is off, such as behind a host firewall, `NET_ADMIN` alone is enough:

1. In the Web UI, empty the PostUp and PostDown hooks under Admin → Hooks, and turn off the per-client firewall under Admin → Interface. Do this first, because a failing hook stops the interface from coming up.
2. Remove `NET_RAW` from `cap_add`.
3. Remove `XTABLES_LOCKFILE`.

`iptables-backend` cannot switch the container to `iptables-nft`. It logs `update-alternatives: error` when it tries, and then starts `wg-easy` as usual. On a host without legacy iptables, write the hooks with `iptables-nft` and `ip6tables-nft`, or with `nft`, as in [Podman + nftables](./podman-nft.md).
