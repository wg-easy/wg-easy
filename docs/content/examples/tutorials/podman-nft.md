---
title: Podman + nftables
---

This guide will show you how to run `wg-easy` with rootful Podman and nftables.

## Requirements

1. Podman installed with version 4.4 or higher

## Configuration

Create a Folder for the configuration files:

```shell
sudo mkdir -p /etc/containers/systemd/wg-easy
sudo mkdir -p /etc/containers/volumes/wg-easy
```

Create a file `/etc/containers/systemd/wg-easy/wg-easy.container` with the following content:

<!-- ref: major version -->

```ini
[Container]
ContainerName=wg-easy
Image=ghcr.io/wg-easy/wg-easy:15
AutoUpdate=registry

Volume=/etc/containers/volumes/wg-easy:/etc/wireguard:Z
Network=wg-easy.network
PublishPort=51820:51820/udp
PublishPort=51821:51821/tcp

# this is used to allow access over HTTP
# remove this when using a reverse proxy
Environment=INSECURE=true

AddCapability=NET_ADMIN
AddCapability=SYS_MODULE
AddCapability=NET_RAW
Sysctl=net.ipv4.ip_forward=1
Sysctl=net.ipv4.conf.all.src_valid_mark=1
Sysctl=net.ipv6.conf.all.disable_ipv6=0
Sysctl=net.ipv6.conf.all.forwarding=1
Sysctl=net.ipv6.conf.default.forwarding=1

[Install]
# this is used to start the container on boot
WantedBy=default.target
```

Create a file `/etc/containers/systemd/wg-easy/wg-easy.network` with the following content:

```ini
[Network]
NetworkName=wg-easy
IPv6=true
```

## Load Kernel Modules

You will need to load the following kernel modules

```txt
wireguard
nft_masq
```

Create a file `/etc/modules-load.d/wg-easy.conf` with the following content:

```txt
wireguard
nft_masq
```

## Start the Container

```shell
sudo systemctl daemon-reload
sudo systemctl start wg-easy
```

## Edit Hooks

In the Admin Panel of your WireGuard server, go to the `Hooks` tab and add the following hook:

1. PostUp

    ```shell
    nft add table inet wg_table; nft add chain inet wg_table prerouting { type nat hook prerouting priority 100 \; }; nft add chain inet wg_table postrouting { type nat hook postrouting priority 100 \; }; nft add rule inet wg_table postrouting ip saddr {{ipv4Cidr}} oifname {{device}} masquerade; nft add rule inet wg_table postrouting ip6 saddr {{ipv6Cidr}} oifname {{device}} masquerade; nft add chain inet wg_table input { type filter hook input priority 0 \; policy accept \; }; nft add rule inet wg_table input udp dport {{port}} accept; nft add rule inet wg_table input tcp dport {{uiPort}} accept; nft add chain inet wg_table forward { type filter hook forward priority 0 \; policy accept \; }; nft add rule inet wg_table forward iifname "wg0" accept; nft add rule inet wg_table forward oifname "wg0" accept;
    ```

2. PostDown

    ```shell
    nft delete table inet wg_table
    ```

If you don't have iptables loaded on your server, you could see many errors in the logs or in the UI. You can ignore them.

## Restart the Container

Restart the container to apply the new hooks:

```shell
sudo systemctl restart wg-easy
```
