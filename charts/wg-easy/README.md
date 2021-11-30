
WireGuard Easy Helm Chart
===========

A [WireGuard Easy](https://github.com/WeeJeWel/wg-easy) Helm Chart.


## Configuration

The following table lists the configurable parameters of the wg-easy chart and their default values.

| Parameter                | Description             | Default        |
| ------------------------ | ----------------------- | -------------- |
| `web.password` | When set, requires a password when logging in to the Web UI. | `""` |
| `web.service.type` | Service Type to create for the wg-easy front-end service. | `"ClusterIP"` |
| `web.service.port` | The TCP port of the wg-easy front-end for Wireguard. | `51821` |
| `web.service.externalTrafficPolicy` | Wireguard Service externalTrafficPolicy | `Local` |
| `web.service.loadBalancerIP` | Wireguard Service externalTrafficPolicy | `null` |
| `wireguard.service.type` | Service Type to create for the Wireguard VPN service | `"ClusterIP"` |
| `wireguard.service.port` | The UDP port for the Wireguard VPN service. | `51820` |
| `wireguard.service.externalTrafficPolicy` | Wireguard Service externalTrafficPolicy | `Local` |
| `wireguard.host` | The public hostname or IP address of your VPN server. Required. | `""` |
| `wireguard.clientAddrRange` | Client IP address range. | `"10.8.0.x"` |
| `wireguard.dns` | DNS server clients will use. | `"1.1.1.1"` |
| `wireguard.allowedIps` | Allowed IP's clients will use. | `"0.0.0.0/0, ::/0"` |
| `wireguard.persistentKeepalive` | Value in seconds to keep the "connection" open. | `0` |
| `ingress.enabled` | Enable Ingress creation if true. | `false` |
| `ingress.annotations` | Annotations to be applied to the Ingress object when Ingress is enabled. | `{}` |
| `ingress.hosts` | Hostnames to use with Ingress, when enabled. | `[{"host": "chart-example.local", "paths": []}]` |
| `persistence.enabled` | When set to true, this will enable persistence. | `false` |
| `persistence.size` | Volume size when using persistence. | `"100Mi"` |
| `persistence.annotations` | Persistent Volume Annotations | `{}` |
| `persistence.accessModes` | Persistent Volume Access Mode | `["ReadWriteOnce"]` |
| `persistence.subPath` | Persistent Volume sub-path | `""` |
