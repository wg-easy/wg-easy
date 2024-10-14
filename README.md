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

* All-in-one: WireGuard + Web UI.
* Easy installation, simple to use.
* List, create, edit, delete, enable & disable clients.
* Show a client's QR code.
* Download a client's configuration file.
* Statistics for which clients are connected.
* Tx/Rx charts for each connected client.
* Gravatar support.
* Automatic Light / Dark Mode
* Multilanguage Support
* Traffic Stats (default off)
* One Time Links (default off)
* Client Expiry (default off)
* Prometheus metrics support

## Requirements

* A host with a kernel that supports WireGuard (all modern kernels).
* A host with Docker installed.

## Versions

> 💡 For the **stable** version please read instructions on the
> [**production** branch](https://github.com/wg-easy/wg-easy/tree/production)!

We provide more than 1 docker image tag, the following will help you decide
which one suits the best for you.

| tag | Branch | Example | Description |
| - | - | - | - |
| `latest` | [`production`](https://github.com/wg-easy/wg-easy/tree/production) | `ghcr.io/wg-easy/wg-easy:latest` or `ghcr.io/wg-easy/wg-easy` | stable as possible, gets bug fixes quickly when needed, deployed against [`production`](https://github.com/wg-easy/wg-easy/tree/production). |
| `14` | [`production`](https://github.com/wg-easy/wg-easy/tree/production) | `ghcr.io/wg-easy/wg-easy:14` | same as latest, stick to a version tag. |
| `nightly` | [`master`](https://github.com/wg-easy/wg-easy/tree/master) | `ghcr.io/wg-easy/wg-easy:nightly` | mostly unstable, gets frequent package and code updates, deployed against [`master`](https://github.com/wg-easy/wg-easy/tree/master). |
| `development` | pull requests | `ghcr.io/wg-easy/wg-easy:development` | used for development, testing code from PRs before landing into [`master`](https://github.com/wg-easy/wg-easy/tree/master). |

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running:

```shell
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $(whoami)
exit
```

And log in again.

### 2. Run WireGuard Easy

To automatically install & run wg-easy, simply run:

```shell
docker run --detach \
  --name wg-easy \
  --env LANG=de \
  --env WG_HOST=<🚨YOUR_SERVER_IP> \
  --env PASSWORD_HASH='<🚨YOUR_ADMIN_PASSWORD_HASH>' \
  --env PORT=51821 \
  --env WG_PORT=51820 \
  --volume ~/.wg-easy:/etc/wireguard \
  --publish 51820:51820/udp \
  --publish 51821:51821/tcp \
  --cap-add NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl 'net.ipv4.conf.all.src_valid_mark=1' \
  --sysctl 'net.ipv4.ip_forward=1' \
  --restart unless-stopped \
  ghcr.io/wg-easy/wg-easy
```

> 💡 Replace `<🚨YOUR_SERVER_IP>` with your WAN IP, or a Dynamic DNS hostname.
>
> 💡 Replace `<🚨YOUR_ADMIN_PASSWORD_HASH>` with a bcrypt password hash to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:51821`.

The Prometheus metrics will now be available on `http://0.0.0.0:51821/metrics`. Grafana dashboard [21733](https://grafana.com/grafana/dashboards/21733-wireguard/)

> 💡 Your configuration files will be saved in `~/.wg-easy`

WireGuard Easy can be launched with Docker Compose as well - just download
[`docker-compose.yml`](docker-compose.yml), make necessary adjustments and
execute `docker compose up --detach`.

### 3. Sponsor

Are you enjoying this project? [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env | Default | Example | Description |
| - | - | - | - |
| `PORT` | `51821` | `6789` | TCP port for Web UI. |
| `WEBUI_HOST` | `0.0.0.0` | `localhost` | IP address web UI binds to. |
| `PASSWORD_HASH` | - | `$2y$05$Ci...` | When set, requires a password when logging in to the Web UI. You can use `wgcli pw` |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server. |
| `WG_DEVICE` | `eth0` | `ens6f0` | Ethernet device the wireguard traffic should be forwarded through. |
| `WG_PORT` | `51820` | `12345` | The public UDP port of your VPN server. WireGuard will listen on that (otherwise default) inside the Docker container. |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IP address range. |
| `WG_DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use. If set to blank value, clients will not use any DNS. |
| `WG_ALLOWED_IPS` | `0.0.0.0/0, ::/0` | `192.168.15.0/24, 10.0.1.0/24` | Allowed IPs clients will use. |
| `WG_PRE_UP` | `...` | - | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L19) for the default value.                                             |
| `WG_POST_UP` | `...` | `iptables ...` | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L20) for the default value.                                             |
| `WG_PRE_DOWN` | `...` | - | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L27) for the default value.                                             |
| `WG_POST_DOWN` | `...` | `iptables ...` | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L28) for the default value.                                             |
| `WG_ENABLE_EXPIRES_TIME` | `false` | `true`                         | Enable expire time for clients |
| `LANG` | `en` | `de` | Web UI language (Supports: en, ua, ru, tr, no, pl, fr, de, ca, es, ko, vi, nl, is, pt, chs, cht, it, th, hi, ja, si).                                        |
| `UI_TRAFFIC_STATS` | `false` | `true` | Enable detailed RX / TX client stats in Web UI |
| `UI_CHART_TYPE` | `0` | `1` | UI_CHART_TYPE=0 # Charts disabled, UI_CHART_TYPE=1 # Line chart, UI_CHART_TYPE=2 # Area chart, UI_CHART_TYPE=3 # Bar chart |
| `WG_ENABLE_ONE_TIME_LINKS` | `false` | `true` | Enable display and generation of short one time download links (expire after 5 minutes) |
| `MAX_AGE` | `0` | `1440` | The maximum age of Web UI sessions in minutes. `0` means that the session will exist until the browser is closed. |
| `UI_ENABLE_SORT_CLIENTS` | `false` | `true`                         | Enable UI sort clients by name   |
| `ENABLE_PROMETHEUS_METRICS` | `false` | `true`                       | Enable Prometheus metrics `http://0.0.0.0:51821/metrics` and `http://0.0.0.0:51821/metrics/json`|
| `PROMETHEUS_METRICS_PASSWORD` | - | `$2y$05$Ci...` | If set, Basic Auth is required when requesting metrics. You can use `wgcli pw` |

> If you change `WG_PORT`, make sure to also change the exposed port.

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
[defaults to `latest`](https://docs.docker.com/engine/reference/run/#image-references)).

## Common Use Cases

* [Using WireGuard-Easy with Pi-Hole](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-Pi-Hole)
* [Using WireGuard-Easy with nginx/SSL](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-nginx-SSL)

## wgcli - Command Line Tool

`wgcli` is a command line client for managing WireGuard configurations, including password hashing, password verification, and managing WireGuard clients. It is designed to be used alongside WireGuard Easy for advanced control over WireGuard clients.

### Features

* Password hashing and comparison for use with the Web UI.
* Create, delete, enable, disable, and get details of WireGuard clients.
* Easily integrate into any WireGuard setup using the Docker container.

### Commands

`wgcli` provides two main sets of commands: `pw` for password-related operations and `client` for managing WireGuard clients.

#### `pw` Command
The `pw` command allows you to hash a password or compare a password against a hash.

- **Hash a Password**:
  ```
  wgcli pw hash [YOUR_PASSWORD]
  ```
  If `[YOUR_PASSWORD]` is not provided, it will prompt for it via stdin.

- **Compare Password and Hash**:
  ```
  wgcli pw compare [YOUR_PASSWORD] [HASH]
  ```
  Compare the provided password with the given hash.

#### `client` Command
The `client` command allows you to create, delete, enable, disable, and get information on WireGuard clients.

- **Create a Client**:
  ```
  wgcli client create [NAME] [EXPIRED_DATE]
  ```
  Creates a new WireGuard client with an optional name and expiry date.

- **Delete a Client**:
  ```
  wgcli client delete [CLIENT_ID]
  ```
  Deletes the specified client.

- **Enable a Client**:
  ```
  wgcli client enable [CLIENT_ID]
  ```
  Enables the specified client.

- **Disable a Client**:
  ```
  wgcli client disable [CLIENT_ID]
  ```
  Disables the specified client.

- **Get Client Details**:
  ```
  wgcli client get [CLIENT_ID]
  ```
  Retrieves details for the specified client.

### Example Usage

To create a new WireGuard client named `client1`:

```shell
wgcli client create client1
```

To generate a password hash for the admin login:

```shell
wgcli pw hash
```

To compare a password with a hash:

```shell
wgcli pw compare mypassword '$2y$12$...'
```

### Integration

`wgcli` can be easily integrated into Docker environments, working in tandem with WireGuard Easy for a comprehensive management experience.

The Web UI will still be available on `http://0.0.0.0:51821`, and `wgcli` can be used as a powerful supplementary tool for additional client management, especially in automation workflows or advanced use cases.

