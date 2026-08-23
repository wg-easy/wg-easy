---
title: Optional Configuration
---

You can set these environment variables to configure the container. They are not required, but can be useful in some cases.

| Env                           | Default   | Example                     | Description                                                              |
| ----------------------------- | --------- | --------------------------- | ------------------------------------------------------------------------ |
| `PORT`                        | `51821`   | `6789`                      | TCP port for Web UI.                                                     |
| `HOST`                        | `0.0.0.0` | `localhost`                 | IP address web UI binds to.                                              |
| `INSECURE`                    | `false`   | `true`                      | If access over http is allowed                                           |
| `DISABLE_IPV6`                | `false`   | `true`                      | If IPv6 support should be disabled                                       |
| `DISABLE_VERSION_CHECK`       | `false`   | `true`                      | If wg-easy should check for new updates                                  |
| `TRUSTED_PROXIES`             |           | `172.18.0.2,fd00:1234::/64` | Proxy IP addresses or CIDRs allowed to forward the request host          |
| `FLCLASH_REMOTE_CIDRS`        |           | `192.168.1.0/24,fd00::/64`  | Additional remote networks routed through the generated FlClash profile  |
| `FLCLASH_ENDPOINT_IP_VERSION` | `dual`    | `ipv6-prefer`               | Endpoint resolution mode used by the generated FlClash WireGuard profile |

## FlClash profile export

Each client card includes an **FC** download button. It generates a Mihomo
profile that sends the WireGuard tunnel networks and any networks listed in
`FLCLASH_REMOTE_CIDRS` through WireGuard, routes Chinese destinations directly,
and routes remaining traffic through WireGuard. Multiple IPv4 or IPv6 CIDRs can
be separated by commas or spaces.

`FLCLASH_ENDPOINT_IP_VERSION` accepts `dual`, `ipv4`, `ipv6`, `ipv4-prefer`, or
`ipv6-prefer`. Generated files contain the client's private key and are returned
with no-store response headers; treat them like regular WireGuard client
configurations.

## Trusted Proxies

Set `TRUSTED_PROXIES` when wg-easy runs behind a reverse proxy and needs to use
the original host. Multiple IPv4 or IPv6 addresses and CIDRs can be provided as
a comma-separated list:

```yaml
environment:
    - TRUSTED_PROXIES=172.18.0.2,fd00:1234::/64
```

Only add the source addresses used by your reverse proxy. wg-easy only uses
`X-Forwarded-Host` when the request comes from one of these addresses. The
request protocol remains controlled by `INSECURE`. Invalid addresses prevent
wg-easy from starting so that configuration errors are not silently ignored.
Restart the container after changing this setting.

/// note | IPv6 Caveats

Disabling IPv6 will disable the creation of the default IPv6 firewall rules and won't add a IPv6 address to the interface and clients.

You will however still see a IPv6 address in the Web UI, but it won't be used.

This option can be removed in the future, as more devices support IPv6.

///
