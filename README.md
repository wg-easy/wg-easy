# WireGuard Easy

## Installation

### 1. Install Docker
Make sure you have [Docker](https://docs.docker.com/get-docker/) installed.

### 2. Configure

```bash
# Create a directory for the configuration files
$ mkdir ~/.wg-easy
$ cd ~/.wg-easy
$ wget https://raw.githubusercontent.com/WeeJeWel/wg-easy/master/docker-compose.yml
$ vim docker-compose.yml
```

Change `WG_HOST=raspberrypi.local` to your server's public address, e.g. `WG_HOST=vpn.mydomain.com`.

Optionally, set a Web UI password by uncommenting `PASSWORD=foobar123` and change the password.

### 3. Run

```bash
$ docker compose up
```

The Web UI will be available on `http://0.0.0.0:51821`. You can create new clients there.

## Options

These options can be configured in `docker-compose.yml` under `environment`.

| Env | Default | Example | Description |
| - | - | - | - |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server |
| `WG_PORT` | `51820` | `51820` | The public UDP port of your VPN server |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IP address range |
| `WG_DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use |

> If you change `WG_PORT`, make sure to also change the exposed port.