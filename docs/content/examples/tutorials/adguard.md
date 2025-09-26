---
title: AdGuard Home
---

This tutorial is a follow-up to the official [Traefik tutorial](./traefik.md). It will guide you through integrating AdGuard Home with your existing `wg-easy` and Traefik setup to provide network-wide DNS ad-blocking.

## Prerequisites

- A working [wg-easy](./basic-installation.md) and [Traefik](./traefik.md) setup from the previous guides.

/// warning | Important: Following this guide will reset your WireGuard configuration.
The process involves re-creating the `wg-easy` container and its data, which means **all existing WireGuard clients and settings will be deleted.**

You will need to create your clients again after completing this guide.
///

## Add `adguard` configuration

1. Create a directory for the configuration files:

    ```shell
    sudo mkdir -p /etc/docker/containers/adguard
    ```

2. Create volumes for persistent data:

    ```shell
    sudo mkdir -p /etc/docker/volumes/adguard/adguard_work
    sudo mkdir -p /etc/docker/volumes/adguard/adguard_conf
    sudo chmod -R 700 /etc/docker/volumes/adguard
    ```

3. Create the `docker-compose.yml` file.

File: `/etc/docker/containers/adguard/docker-compose.yml`

```yaml
services:
    adguard:
        image: adguard/adguardhome:v0.107.64
        container_name: adguard
        restart: unless-stopped
        volumes:
            - /etc/docker/volumes/adguard/adguard_work:/opt/adguardhome/work
            - /etc/docker/volumes/adguard/adguard_conf:/opt/adguardhome/conf
        networks:
            wg:
                interface_name: eth0
                ipv4_address: 10.42.42.43
                ipv6_address: fdcc:ad94:bacf:61a3::2b
            traefik:
                interface_name: eth1
        labels:
            - 'traefik.enable=true'
            - 'traefik.http.routers.adguard.rule=Host(`adguard.$example.com$`)'
            - 'traefik.http.routers.adguard.entrypoints=websecure'
            - 'traefik.http.routers.adguard.service=adguard'
            - 'traefik.http.services.adguard.loadbalancer.server.port=3000'
            - 'traefik.docker.network=traefik'

networks:
    wg:
        external: true
    traefik:
        external: true
```

## Update `wg-easy` configuration

Modify the corresponding sections of your existing `wg-easy` compose file to match the updated version below.

File: `/etc/docker/containers/wg-easy/docker-compose.yml`

```yaml
services:
  wg-easy:
    ports:
      - "51820:51820/udp"
    ...
    networks:
      wg:
        interface_name: eth0
        ...
      traefik:
        interface_name: eth1
      ...
    ...
    environment:
      # Unattended Setup
      - INIT_ENABLED=true
      # Replace $username$ with your username
      - INIT_USERNAME=$username$
      # Replace $password$ with your unhashed password
      - INIT_PASSWORD=$password$
      # Replace $example.com$ with your domain
      - INIT_HOST=wg-easy.$example.com$
      - INIT_PORT=51820
      - INIT_DNS=10.42.42.43,fdcc:ad94:bacf:61a3::2b
      - INIT_IPV4_CIDR=10.8.0.0/24
      - INIT_IPV6_CIDR=fd42:42:42::/64
    ...

networks:
  wg:
    # Prevents Docker Compose from prefixing the network name.
    name: wg
    ...
  ...
```

## Setup Wireguard

1. Restart `wg-easy`:

    ```shell
    cd /etc/docker/containers/wg-easy
    sudo docker compose down -v
    sudo docker compose up -d
    ```

2. Edit Wireguard's Hooks.

    In the Admin Panel of your WireGuard server, go to the Hooks tab and replace it with:

    **_PostUp_**

    ```shell
    iptables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; ip6tables -A INPUT -p udp -m udp --dport {{port}} -j ACCEPT; iptables -t nat -A PREROUTING -i wg0 -p udp --dport 53 -j DNAT --to-destination 10.42.42.43; iptables -t nat -A PREROUTING -i wg0 -p tcp --dport 53 -j DNAT --to-destination 10.42.42.43; ip6tables -t nat -A PREROUTING -i wg0 -p udp --dport 53 -j DNAT --to-destination fdcc:ad94:bacf:61a3::2b; ip6tables -t nat -A PREROUTING -i wg0 -p tcp --dport 53 -j DNAT --to-destination fdcc:ad94:bacf:61a3::2b; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE; ip6tables -t nat -A POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE;
    ```

    **_PostDown_**

    ```shell
    iptables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT || true; ip6tables -D INPUT -p udp -m udp --dport {{port}} -j ACCEPT || true; iptables -t nat -D PREROUTING -i wg0 -p udp --dport 53 -j DNAT --to-destination 10.42.42.43 || true; iptables -t nat -D PREROUTING -i wg0 -p tcp --dport 53 -j DNAT --to-destination 10.42.42.43 || true; ip6tables -t nat -D PREROUTING -i wg0 -p udp --dport 53 -j DNAT --to-destination fdcc:ad94:bacf:61a3::2b || true; ip6tables -t nat -D PREROUTING -i wg0 -p tcp --dport 53 -j DNAT --to-destination fdcc:ad94:bacf:61a3::2b || true; iptables -D FORWARD -i wg0 -j ACCEPT || true; iptables -D FORWARD -o wg0 -j ACCEPT || true; ip6tables -D FORWARD -i wg0 -j ACCEPT || true; ip6tables -D FORWARD -o wg0 -j ACCEPT || true; iptables -t nat -D POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE || true; ip6tables -t nat -D POSTROUTING -s {{ipv6Cidr}} -o {{device}} -j MASQUERADE || true;
    ```

3. Restart `wg-easy` to apply changes:

    ```shell
    sudo docker restart wg-easy
    ```

## Setup Adguard Home

1. Start `adguard` service:

    ```shell
    cd /etc/docker/containers/adguard
    sudo docker compose up -d
    ```

2. Navigate to `https://adguard.$example.com$` to begin the AdGuard Home setup.

/// warning | Important: Configure AdGuard Home Admin Web Interface Port
During the initial AdGuard Home setup on the `Step 2/5` page, you **must** set the **Admin Web Interface Port** to **3000**. Do not use the default port 80, as it will not work with the Traefik configuration.

After completing the setup, the AdGuard UI might appear unresponsive. This is expected. **Simply reload the page**, and the panel will display correctly.
///

> If you accidentally left it default (80), you will need to manually edit the `docker-compose.yml` file for AdGuard Home (`/etc/docker/containers/adguard/docker-compose.yml`) and change the line `traefik.http.services.adguard.loadbalancer.server.port=3000` to `traefik.http.services.adguard.loadbalancer.server.port=80`. After making this change, restart AdGuard Home by navigating to `/etc/docker/containers/adguard` and running `sudo docker compose up -d`.

## Final System Checks

### Firewall

Ensure the ports `80/tcp`, `443/tcp`, `443/udp`, and `51820/udp` are open.

### Optional: Optimizing UDP Buffer Sizes

AdGuard Home, as a DNS server, handles a large volume of UDP packets. To ensure optimal performance, it is recommended to increase the system's UDP buffer sizes. You can apply these settings using your system's `sysctl` configuration (e.g., by creating a file in `/etc/sysctl.d/`).

```shell
net.core.rmem_max = 7500000
net.core.wmem_max = 7500000
```

After adding these settings, remember to apply them (e.g., by running `sudo sysctl --system` or rebooting)
