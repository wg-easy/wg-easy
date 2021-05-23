# WireGuard Easy

## Usage

```bash
$ docker run \
  --name wg-easy \
  --mount type=bind,source=~/.wg-easy,target=/etc/wireguard \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --restart=unless-stopped \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  weejewel/wg-easy
```

The Web UI will be available on `http://0.0.0.0:51821`. By default, it doesn't require a password.

> Configuration files will be stored in `~/.wg-easy/` on your host.


## Options

Set options by appending them to the `docker run` command. For example, add `--env PASSWORD=foobar123` to set a password.

| Env | Default | Example | Description |
| - | - | - | - |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server |
| `WG_PORT` | `51820` | `51820` | The public UDP port of your VPN server |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IP address range |
| `WG_DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use |

> If you change `WG_PORT`, make sure to also change the exposed port in the `docker run` command.