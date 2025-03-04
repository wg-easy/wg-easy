---
title: Basic Installation
---

<!-- TOOD: add docs for pihole, nginx, caddy, traefik -->

## Requirements

1. You need to have a host that you can manage
2. You need to have a domain name or a public IP address
3. You need a supported architecture (x86_64, arm64)
4. You need curl installed on your host

## Install Docker

Follow the Docs here: <https://docs.docker.com/engine/install/> and install Docker on your host.

## Install `wg-easy`

1. Create a directory for the configuration files (you can choose any directory you like):

   ```shell
   DIR=/docker/wg-easy
   sudo mkdir -p $DIR
   ```

2. Download docker compose file

   ```shell
   sudo curl -o $URL/docker-compose.yml https://raw.githubusercontent.com/wg-easy/wg-easy/master/docker-compose.yml
   ```

3. Start `wg-easy`

   ```shell
    sudo docker-compose -f $DIR/docker-compose.yml up -d
   ```

## Setup Firewall

If you are using a firewall, you need to open the following ports:

- UDP 51820 (WireGuard)
- TCP 51821 (Web UI)

These ports can be changed, so if you change them you have to update your firewall rules accordingly.

## Access the Web UI

Open your browser and navigate to `https://<your-domain>:51821` or `https://<your-ip>:51821`.

Follow the instructions to set up your WireGuard VPN.
