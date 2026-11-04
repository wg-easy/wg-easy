---
title: Optional Configuration
---

You can set these environment variables to configure the container. They are not required, but can be useful in some cases.

| Env                     | Default   | Example                     | Description                                                              |
| ----------------------- | --------- | --------------------------- | ------------------------------------------------------------------------ |
| `PORT`                  | `51821`   | `6789`                      | TCP port for Web UI.                                                     |
| `HOST`                  | `0.0.0.0` | `localhost`                 | IP address web UI binds to.                                              |
| `INSECURE`              | `false`   | `true`                      | Allow cookies over HTTP; also selects the fallback public URL scheme     |
| `DISABLE_IPV6`          | `false`   | `true`                      | If IPv6 support should be disabled                                       |
| `DISABLE_VERSION_CHECK` | `false`   | `true`                      | Disable checks for new wg-easy releases                                  |
| `TRUSTED_PROXIES`       |           | `172.18.0.2,fd00:1234::/64` | Trusted proxy IPs/CIDRs; a nonempty list also enables CSRF origin checks |
| `WG_INTERFACE`          | `wg0`     | `wg1`                       | Name of the WireGuard interface                                          |

/// note | IPv6 Caveats

Disabling IPv6 will disable the creation of the default IPv6 firewall rules and won't add a IPv6 address to the interface and clients.

You will however still see a IPv6 address in the Web UI, but it won't be used.

This option can be removed in the future, as more devices support IPv6.

///

## Trusted Proxies

Set `TRUSTED_PROXIES` when wg-easy runs behind a reverse proxy and needs to use
the public host, protocol, or client IP. Supply a comma-separated list of the
proxy's source IPv4/IPv6 addresses or CIDRs:

```yaml
environment:
    - TRUSTED_PROXIES=172.18.0.2,fd00:1234::/64
```

Only requests from these addresses may supply `X-Forwarded-Host`,
`X-Forwarded-Proto`, and `X-Forwarded-For`. The forwarded client IP is used in
security logs. Proxies must replace client-supplied forwarded headers and
report the public scheme, including when there are multiple proxy layers.
Only trust actual proxy addresses; invalid entries prevent startup. Restart
the container after changing this setting.

### Public URLs and cookies

CSRF checks and OAuth redirects/callbacks use the same public URL rules:

- Preserve the public `Host`, or supply `X-Forwarded-Host` from a trusted proxy.
  Include any non-default public port.
- A trusted `X-Forwarded-Proto` supplies the scheme when its first
  comma-separated value is `http` or `https`.
- Missing, invalid, or untrusted protocol headers retain the existing fallback:
  HTTPS with `INSECURE=false`, HTTP with `INSECURE=true`.

An incorrect public URL can cause CSRF rejections or OAuth redirect URI
mismatches. Existing proxies without protocol forwarding retain the fallback.

`INSECURE` still controls the session cookie's `Secure` attribute independently:
`true` permits cookies over HTTP. Trusted `X-Forwarded-Proto: https` allows
HTTPS writes with that setting, but does not secure the cookie. Keep
`INSECURE=false` for HTTPS deployments, even over an HTTP upstream connection.

### CSRF implications

In this major release, a nonempty list also enables [CSRF origin checks](../api.md#csrf-protection)
for all writes, including direct requests. This applies even when proxies were
configured only for logging. API scripts must then supply a matching `Origin`
or a same-origin `Referer` when `Origin` is absent.

Leaving the list unset or empty ignores forwarded headers and disables the
origin check. See [CSRF protection](../api.md#csrf-protection) for the security
implications and the planned default enforcement in the next major release.

## WireGuard Interface

Set `WG_INTERFACE` to specify a custom interface name, useful if you are running multiple wg-easy instances on the same host with `network_mode: host`:

```yaml
environment:
    - WG_INTERFACE=wg1
```
