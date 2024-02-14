# AmnewziaWG Easy

You have found the easiest way to install & manage AmneziaWG on any Linux host!

<p align="center">
  <img src="./assets/screenshot.png" width="802" />
</p>

## Features

* All-in-one: AmneziaWG + Web UI.
* Easy installation, simple to use.
* List, create, edit, delete, enable & disable clients.
* Download a client's configuration file.
* Statistics for which clients are connected.
* Tx/Rx charts for each connected client.
* Gravatar support.
* Automatic Light / Dark Mode

## Requirements

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

### 2. Run AmneziaWG Easy

<pre>
$ docker run -d \
  --name=amnezia-wg-easy \
  -e LANG=en \
  -e WG_HOST=<b>🚨YOUR_SERVER_IP</b> \
  -e PASSWORD=<b>🚨YOUR_ADMIN_PASSWORD</b> \
  -v ~/.amnezia-wg-easy:/etc/wireguard \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --sysctl="net.ipv4.ip_forward=1" \
  --device=/dev/net/tun:/dev/net/tun \
  --restart unless-stopped \
  ghcr.io/spcfox/amnezia-wg-easy
</pre>

> 💡 Replace `YOUR_SERVER_IP` with your WAN IP, or a Dynamic DNS hostname.
>
> 💡 Replace `YOUR_ADMIN_PASSWORD` with a password to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:51821`.

> 💡 Your configuration files will be saved in `~/.amnezia-wg-easy`

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env | Default | Example | Description |
| - | - | - | - |
| `LANGUAGE` | `en` | `de` | Web UI language (Supports: en, ru, tr, no, pl, fr, de, ca, es). |
| `CHECK_UPDATE` | `true` | `false` | Check for a new version and display a notification about its availability |
| `PORT` | `51821` | `6789` | TCP port for Web UI. |
| `WEBUI_HOST` | `0.0.0.0` | `localhost` | IP address web UI binds to. |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server. |
| `WG_DEVICE` | `eth0` | `ens6f0` | Ethernet device the wireguard traffic should be forwarded through. |
| `WG_PORT` | `51820` | `12345` | The public UDP port of your VPN server. WireGuard will always listen on 51820 inside the Docker container. |
| `WG_MTU` | `null` | `1420` | The MTU the clients will use. Server uses default WG MTU. |
| `WG_PERSISTENT_KEEPALIVE` | `0` | `25` | Value in seconds to keep the "connection" open. If this value is 0, then connections won't be kept alive. |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IP address range. |
| `WG_DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use. If set to blank value, clients will not use any DNS. |
| `WG_ALLOWED_IPS` | `0.0.0.0/0, ::/0` | `192.168.15.0/24, 10.0.1.0/24` | Allowed IPs clients will use. |
| `WG_PRE_UP` | `...` | - | See [config.js](/src/config.js#L21) for the default value. |
| `WG_POST_UP` | `...` | `iptables ...` | See [config.js](/src/config.js#L22) for the default value. |
| `WG_PRE_DOWN` | `...` | - | See [config.js](/src/config.js#L29) for the default value. |
| `WG_POST_DOWN` | `...` | `iptables ...` | See [config.js](/src/config.js#L30) for the default value. |
| `JC` | `random` | `5` | Junk packet count — number of packets with random data that are sent before the start of the session. |
| `JMIN` | `50` | `25` | Junk packet minimum size — minimum packet size for Junk packet. That is, all randomly generated packets will have a size no smaller than Jmin. |
| `JMAX` | `1000` | `250` | Junk packet maximum size — maximum size for Junk packets. |
| `S1` | `random` | `75` | Init packet junk size — the size of random data that will be added to the init packet, the size of which is initially fixed. |
| `S2` | `random` | `75` | Response packet junk size — the size of random data that will be added to the response packet, the size of which is initially fixed. |
| `H1` | `random` | `1234567891` | Init packet magic header — the header of the first byte of the handshake. Must be < uint_max. |
| `H2` | `random` | `1234567892` | Response packet magic header — header of the first byte of the handshake response. Must be < uint_max. |
| `H3` | `random` | `1234567893` | Underload packet magic header — UnderLoad packet header. Must be < uint_max. |
| `H4` | `random` | `1234567894` | Transport packet magic header — header of the packet of the data packet. Must be < uint_max. |

> If you change `WG_PORT`, make sure to also change the exposed port.

## Updating

To update to the latest version, simply run:

```bash
docker stop amnezia-wg-easy
docker rm amnezia-wg-easy
docker pull ghcr.io/spcfox/amnezia-wg-easy
```

## Thanks

Based on [wg-easy](https://github.com/wg-easy/wg-easy) by Emile Nijssen.
