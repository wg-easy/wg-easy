# WireGuard Easy

[![Build & Publish latest Image](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml/badge.svg?branch=production)](https://github.com/wg-easy/wg-easy/actions/workflows/deploy.yml)
[![Lint](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/wg-easy/wg-easy/actions/workflows/lint.yml)
[![GitHub Stars](https://img.shields.io/github/stars/wg-easy/wg-easy)](https://github.com/wg-easy/wg-easy/stargazers)
[![License](https://img.shields.io/github/license/wg-easy/wg-easy)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/wg-easy/wg-easy)](https://github.com/wg-easy/wg-easy/releases/latest)
[![Image Pulls](https://img.shields.io/badge/image_pulls-11M-blue)](https://github.com/wg-easy/wg-easy/pkgs/container/wg-easy)

<!-- TODO: remove after release -->

> [!WARNING]
> You are viewing the README of the pre-release of v15.
> If you want to setup wg-easy right now. Read the README in the production branch here: [README](https://github.com/wg-easy/wg-easy/tree/production) or here for the last nightly: [README](https://github.com/wg-easy/wg-easy/tree/c6dce0f6fb2e28e7e40ddac1498bd67e9bb17cba)

You have found the easiest way to install & manage WireGuard on any Linux host!

<!-- TOOD: update screenshot -->

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
- One Time Links
- Client Expiration
- Prometheus metrics support
- IPv6 support
- CIDR support

> [!NOTE]
> To better manage documentation for this project, it has its own site here: [https://wg-easy.github.io/wg-easy/latest](https://wg-easy.github.io/wg-easy/latest)

- [Getting Started](https://wg-easy.github.io/wg-easy/latest/getting-started/)
- [Basic Installation](https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/)

## Requirements

- A host with a kernel that supports WireGuard (all modern kernels).
- A host with Docker installed.

## Versions

> 💡 We follow semantic versioning (semver)

We offer multiple Docker image tags to suit your needs. The table below is in a particular order, with the first tag being the most recommended:

| tag           | Branch                                                     | Example                                                       | Description                                                                                                                          |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `15`          | latest minor for that major tag                            | `ghcr.io/wg-easy/wg-easy:15`                                  | latest features for specific major versions, no breaking changes                                                                     |
| `latest`      | latest tag                                                 | `ghcr.io/wg-easy/wg-easy:latest` or `ghcr.io/wg-easy/wg-easy` | stable as possible get bug fixes quickly when needed, see Releases for more information.                                             |
| `15.0`        | latest patch for that minor tag                            | `ghcr.io/wg-easy/wg-easy:15.0`                                | latest patches for specific minor version                                                                                            |
| `15.0.0`      | specific tag                                               | `ghcr.io/wg-easy/wg-easy:15.0.0`                              | specific release, don't use this as this will not get updated                                                                        |
| `nightly`     | [`master`](https://github.com/wg-easy/wg-easy/tree/master) | `ghcr.io/wg-easy/wg-easy:nightly`                             | mostly unstable gets frequent package and code updates, deployed against [`master`](https://github.com/wg-easy/wg-easy/tree/master). |
| `development` | pull requests                                              | `ghcr.io/wg-easy/wg-easy:development`                         | used for development, testing code from PRs before landing into [`master`](https://github.com/wg-easy/wg-easy/tree/master).          |

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running as root:

```shell
curl -sSL https://get.docker.com | sh
exit
```

And log in again.

### 2. Run WireGuard Easy

The easiest way to run WireGuard Easy is with Docker Compose.

Just download [`docker-compose.yml`](docker-compose.yml), make necessary adjustments and
execute `sudo docker compose up -d`.

Now setup a reverse proxy to be able to access the Web UI from the internet.

If you want to access the Web UI over HTTP, change the env var `INSECURE` to `true`. This is not recommended. Only use this for testing

<!-- TOOD: add to docs: Grafana dashboard [21733](https://grafana.com/grafana/dashboards/21733-wireguard/) -->

<!-- TOOD: add to docs
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

-->

### 3. Sponsor

Are you enjoying this project? Consider donating.

Founder: [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

Maintainer: [Buy kaaax0815 a coffee!](https://github.com/sponsors/kaaax0815) ☕

<!-- TOOD: add to docs

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env        | Default   | Example     | Description                    |
| ---------- | --------- | ----------- | ------------------------------ |
| `PORT`.    | `51821`   | `6789`      | TCP port for Web UI.           |
| `HOST`     | `0.0.0.0` | `localhost` | IP address web UI binds to.    |
| `INSECURE` | `false`   | `true`      | If access over http is allowed |

## Updating

To update to the latest version, simply run:

```shell
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

-->

## License

This project is licensed under the AGPL-3.0-only License - see the [LICENSE](LICENSE) file for details

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Jason A. Donenfeld, ZX2C4 or Edge Security

"WireGuard" and the "WireGuard" logo are registered trademarks of Jason A. Donenfeld
