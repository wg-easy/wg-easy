---
title: Basic Installation
---

<!-- TOOD: add docs for pihole, nginx, caddy, traefik -->

## Requirements

1. You need to have a host that you can manage
2. You need to have a domain name or a public IP address
3. You need a supported architecture (x86_64, arm64, armv7)
4. You need curl installed on your host

## Install Docker

Follow the Docs here: <https://docs.docker.com/engine/install/> and install Docker on your host.

## Install `wg-easy`

1. Create a directory for the configuration files (you can choose any directory you like):

    ```shell
    sudo mkdir -p /etc/docker/containers/wg-easy
    ```

2. Download docker compose file

    ```shell
    sudo curl -o /etc/docker/containers/wg-easy/docker-compose.yml https://raw.githubusercontent.com/wg-easy/wg-easy/master/docker-compose.yml
    ```

3. Start `wg-easy`

    ```shell
     cd /etc/docker/containers/wg-easy
     sudo docker compose up -d
    ```

## Setup Firewall

If you are using a firewall, you need to open the following ports:

- UDP 51820 (WireGuard)

These ports can be changed, so if you change them you have to update your firewall rules accordingly.

## Setup Reverse Proxy

- To setup traefik follow the instructions here: [Traefik](./traefik.md)
- To setup caddy follow the instructions here: [Caddy](./caddy.md)
- If you do not want to use a reverse proxy follow the instructions here: [No Reverse Proxy](./reverse-proxyless.md)

## Update `wg-easy`

To update `wg-easy` to the latest version, run:

```shell
cd /etc/docker/containers/wg-easy
sudo docker compose pull
sudo docker compose up -d
```

## Auto Update

If you want to enable auto-updates, follow the instructions here: [Auto Updates][auto-updates]

[auto-updates]: ./auto-updates.md
