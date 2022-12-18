# WireGuard Easy

You have found the easiest way to install & manage WireGuard on any Linux host!
This is a rust port of parent repository

<p align="center">
  <img src="./assets/screenshot.png" width="802" />
</p>

## Features

* All-in-one: WireGuard + Web UI.
* Easy installation, simple to use.
* List, create, edit, delete, clients.
* Show a client's QR code.
* Download a client's configuration file.
* Statistics for which clients are connected.
* Tx/Rx charts for each connected client.
* Gravatar support.

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

To automatically install & run wg-easy, download [docker-compose.deploy.yml](https://github.com/Yamzik/rs-wg/blob/master/docker-compose.deploy.yml), locate to its directory and simply run:

<pre>
$ docker compose -f docker-compose.deploy.yml up -d
</pre>

> 💡 Replace `HOST` with your WAN IP, or a Dynamic DNS hostname.
> 
> 💡 Replace `PASSWORD` with a password to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:8080`.

> 💡 Your configuration files will be saved in `./data`

### 3. Sponsor

Are you enjoying this project? [Buy Weejewel a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env | Default | Example | Description |
| - | - | - | - |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server. |
| `WG_PORT` | `51820` | `12345` | The public UDP port of your VPN server. WireGuard will always listen on this port inside the Docker container. |
| `MTU` | `null` | `1420` | The MTU the clients will use. Server uses default WG MTU. |
| `PERSISTENT_KEEPALIVE` | `0` | `25` | Value in seconds to keep the "connection" open. If this value is 0, then connections won't be kept alive. |
| `DEFAULT_ADDRESS` | `10.8.0.1` | `10.6.0.1` | Clients IP address range. |
| `DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use. |
| `ALLOWED_IPS` | `0.0.0.0/0, ::/0` | `192.168.15.0/24, 10.0.1.0/24` | Allowed IPs clients will use. |
| `PRE_UP` | `...` | - | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L19) for the default value. |
| `POST_UP` | `...` | `iptables ...` | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L20) for the default value. |
| `PRE_DOWN` | `...` | - | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L27) for the default value. |
| `POST_DOWN` | `...` | `iptables ...` | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L28) for the default value. |

> If you change `WG_PORT`, make sure to also change the exposed port.

## Updating

To update to the latest version, simply run:

```bash
docker stop rs-wg
docker rm rs-wg
docker pull yamzeg/rs-wg
```

And then run the `docker compose -f \ ...` command above again.
