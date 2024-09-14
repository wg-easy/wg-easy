# WireGuard Easy

[![Build & Publish Docker Image to Docker Hub](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml/badge.svg?branch=production)](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml)
[![Lint](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml)
![Docker](https://img.shields.io/docker/pulls/weejewel/wg-easy.svg)
[![Sponsor](https://img.shields.io/github/sponsors/weejewel)](https://github.com/sponsors/WeeJeWel)
![GitHub Stars](https://img.shields.io/github/stars/wg-easy/wg-easy)

You have found the easiest way to install & manage WireGuard on any Linux host!

<p align="center">
  <img src="./assets/screenshot.png" width="802" />
</p>

## Features

- All-in-one: WireGuard + Web UI.
- Easy installation, simple to use.
- List, create, edit, delete, enable & disable clients.
- Show a client's QR code.
- Download a client's configuration file.
- Statistics for which clients are connected.
- Tx/Rx charts for each connected client.
- Gravatar support.
- Automatic Light / Dark Mode
- Multilanguage Support
- Traffic Stats (default off)
- One Time Links (default off)
- Client Expiration (default off)
- Prometheus metrics support (default off)

## Requirements

- A host with a kernel that supports WireGuard (all modern kernels).
- A host with Docker installed.

## Versions

We provide more then 1 docker image to get, this will help you decide which one is best for you. <br>
For **stable** versions instead of nightly or development please read **README** from the **production** branch!

| tag           | Branch        | Example                                                       | Description                                                                          |
| ------------- | ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `latest`      | production    | `ghcr.io/wg-easy/wg-easy:latest` or `ghcr.io/wg-easy/wg-easy` | stable as possible get bug fixes quickly when needed, deployed against `production`. |
| `13`          | production    | `ghcr.io/wg-easy/wg-easy:13`                                  | same as latest, stick to a version tag.                                              |
| `nightly`     | master        | `ghcr.io/wg-easy/wg-easy:nightly`                             | mostly unstable gets frequent package and code updates, deployed against `master`.   |
| `development` | pull requests | `ghcr.io/wg-easy/wg-easy:development`                         | used for development, testing code from PRs before landing into `master`.            |

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running:

```bash
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $(whoami)
exit
```

And log in again.

### 2. Run WireGuard Easy

<!-- TODO: prioritize docker compose over docker run -->

To setup the IPv6 Network, simply run once:

```bash
  docker network create \
  -d bridge --ipv6 \
  -d default \
  --subnet 10.42.42.0/24 \
  --subnet fdcc:ad94:bacf:61a3::/64 wg \
```

To automatically install & run wg-easy, simply run:

```bash
  docker run -d \
  --net wg \
  -e PORT=51821 \
  --name wg-easy \
  --ip6 fdcc:ad94:bacf:61a3::2a \
  --ip 10.42.42.42 \
  -v ~/.wg-easy:/etc/wireguard \
  -v /lib/modules:/lib/modules:ro \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --cap-add NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  --sysctl net.ipv6.conf.all.disable_ipv6=0 \
  --sysctl net.ipv6.conf.all.forwarding=1 \
  --sysctl net.ipv6.conf.default.forwarding=1 \
  --restart unless-stopped \
  ghcr.io/wg-easy/wg-easy
```

The Web UI will now be available on `http://0.0.0.0:51821`.

The Prometheus metrics will now be available on `http://0.0.0.0:51821/api/metrics`. Grafana dashboard [21733](https://grafana.com/grafana/dashboards/21733-wireguard/)

> 💡 Your configuration files will be saved in `~/.wg-easy`

WireGuard Easy can be launched with Docker Compose as well - just download
[`docker-compose.yml`](docker-compose.yml), make necessary adjustments and
execute `docker compose up -d`.

### 3. Sponsor

Are you enjoying this project? [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env       | Default           | Example       | Description                                  |
| --------- | ----------------- | ------------- | -------------------------------------------- |
| `PORT`    | `51821`           | `6789`        | TCP port for Web UI.                         |
| `HOST`    | `0.0.0.0`         | `localhost`   | IP address web UI binds to.                  |

## Updating

To update to the latest version, simply run:

```bash
docker stop wg-easy
docker rm wg-easy
docker pull ghcr.io/wg-easy/wg-easy
```

And then run the `docker run -d \ ...` command above again.

With Docker Compose WireGuard Easy can be updated with a single command:
`docker compose up --detach --pull always` (if an image tag is specified in the
Compose file and it is not `latest`, make sure that it is changed to the desired
one; by default it is omitted and
[defaults to `latest`](https://docs.docker.com/engine/reference/run/#image-references)). \
The WireGuard Easy container will be automatically recreated if a newer image
was pulled.

## Common Use Cases

- [Using WireGuard-Easy with Pi-Hole](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-Pi-Hole)
- [Using WireGuard-Easy with nginx/SSL](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-nginx-SSL)

For less common or specific edge-case scenarios, please refer to the detailed information provided in the [Wiki](https://github.com/wg-easy/wg-easy/wiki).
