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
* Automatic Light / Dark Mode (WIP: available in `nightly` build)
* Sessionless HTTP API authentication (WIP: available in `nightly` build)

## Requirements

* A host with a kernel that supports WireGuard (all modern kernels).
* A host with Docker installed.

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running:

```bash
$ curl -sSL https://get.docker.com | sh
$ sudo usermod -aG docker $(whoami)
$ exit
```

And log in again.

### 2. Run WireGuard Easy

To automatically install & run wg-easy, simply run:

<pre>
$ docker run -d \
  --name=wg-easy \
  -e WG_HOST=<b>🚨YOUR_SERVER_IP</b> \
  -e PASSWORD=<b>🚨YOUR_ADMIN_PASSWORD</b> \
  -v ~/.wg-easy:/etc/wireguard \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --privileged=true \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --sysctl="net.ipv4.ip_forward=1" \
  --restart unless-stopped \
  ghcr.io/wg-easy/wg-easy
</pre>

> 💡 Replace `YOUR_SERVER_IP` with your WAN IP, or a Dynamic DNS hostname.
>
> 💡 Replace `YOUR_ADMIN_PASSWORD` with a password to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:51821`.

> 💡 Your configuration files will be saved in `~/.wg-easy`

### 3. Sponsor

Are you enjoying this project? [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env | Default | Example | Description |
| - | - | - | - |
| `PORT` | `51821` | `6789` | TCP port for Web UI. |
| `WEBUI_HOST` | `0.0.0.0` | `localhost` | IP address web UI binds to. |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server. |
| `WG_DEVICE` | `eth0` | `ens6f0` | Ethernet device the wireguard traffic should be forwarded through. |
| `WG_PORT` | `51820` | `12345` | The public UDP port of your VPN server. This will also change the port wireguard will listen to. |
| `WG_INTERFACE` | `wg0` | `wg1` | The interface wireguard will use in the container. (Only needed if `network_mode: host` or `--net=host` is used) |
| `WG_MTU` | `null` | `1420` | The MTU the clients will use. Server uses default WG MTU. |
| `WG_PERSISTENT_KEEPALIVE` | `0` | `25` | Value in seconds to keep the "connection" open. If this value is 0, then connections won't be kept alive. |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IPv4 address range. |
| `WG_DEFAULT_ADDRESS6` | `fd42:42:42::x` | `fd86:ea04:1115::x` | Clients IPv6 address range. |
| `WG_DEFAULT_DNS` | `84.200.69.80` | `84.200.69.80, 84.200.70.40` | DNS server clients will use. |
| `WG_DEFAULT_DNS6` | `2001:1608:10:25::1c04:b12f` | `2001:1608:10:25::1c04:b12f, 2001:1608:10:25::9249:d69b` | DNSv6 server clients will use. |
| `WG_ALLOWED_IPS` | `0.0.0.0/0, ::/0` | `192.168.15.0/24, 10.0.1.0/24` | Allowed IPs clients will use. |
| `WG_PRE_UP` | `...` | - | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L19) for the default value. |
| `WG_POST_UP` | `...` | `iptables ...` | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L20) for the default value. |
| `WG_PRE_DOWN` | `...` | - | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L27) for the default value. |
| `WG_POST_DOWN` | `...` | `iptables ...` | See [config.js](https://github.com/wg-easy/wg-easy/blob/master/src/config.js#L28) for the default value. |

> If you change `WG_PORT`, make sure to also change the exposed port.

## Updating

To update to the latest version, simply run:

```bash
docker stop wg-easy
docker rm wg-easy
docker pull ghcr.io/wg-easy/wg-easy
```

And then run the `docker run -d \ ...` command above again.

## Common Use Cases

* [Using WireGuard-Easy with Pi-Hole](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-Pi-Hole)
* [Using WireGuard-Easy with nginx/SSL](https://github.com/wg-easy/wg-easy/wiki/Using-WireGuard-Easy-with-nginx-SSL)
