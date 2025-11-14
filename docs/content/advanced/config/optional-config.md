---
title: Optional Configuration
---

You can set these environment variables to configure the container. They are not required, but can be useful in some cases.

| Env            | Default   | Example     | Description                        |
| -------------- | --------- | ----------- | ---------------------------------- |
| `PORT`         | `51821`   | `6789`      | TCP port for Web UI.               |
| `HOST`         | `0.0.0.0` | `localhost` | IP address web UI binds to.        |
| `INSECURE`     | `false`   | `true`      | If access over http is allowed     |
| `DISABLE_IPV6` | `false`   | `true`      | If IPv6 support should be disabled |

/// note | IPv6 Caveats

Disabling IPv6 will disable the creation of the default IPv6 firewall rules and won't add a IPv6 address to the interface and clients.

You will however still see a IPv6 address in the Web UI, but it won't be used.

This option can be removed in the future, as more devices support IPv6.

///

## Configuration Overrides

These environment variables allow you to override settings that would normally be configured through the Admin Panel. When set, these values take precedence over database settings at runtime.

### Interface Settings

| Env            | Example       | Description               |
| -------------- | ------------- | ------------------------- |
| `WG_PORT`      | `51820`       | WireGuard interface port  |
| `WG_DEVICE`    | `eth0`        | Network device/interface  |
| `WG_MTU`       | `1420`        | Maximum Transmission Unit |
| `WG_IPV4_CIDR` | `10.8.0.0/24` | IPv4 CIDR range           |
| `WG_IPV6_CIDR` | `fdcc::/112`  | IPv6 CIDR range           |

### Client Connection Settings

| Env                               | Example           | Description                     |
| --------------------------------- | ----------------- | ------------------------------- |
| `WG_HOST`                         | `vpn.example.com` | Host clients will connect to    |
| `WG_CLIENT_PORT`                  | `51820`           | Port clients will connect to    |
| `WG_DEFAULT_DNS`                  | `1.1.1.1,8.8.8.8` | Default DNS servers for clients |
| `WG_DEFAULT_ALLOWED_IPS`          | `0.0.0.0/0,::/0`  | Default allowed IPs for clients |
| `WG_DEFAULT_MTU`                  | `1420`            | Default MTU for clients         |
| `WG_DEFAULT_PERSISTENT_KEEPALIVE` | `25`              | Default persistent keepalive    |

### General Settings

| Env                     | Example           | Description               |
| ----------------------- | ----------------- | ------------------------- |
| `WG_SESSION_TIMEOUT`    | `3600`            | Session timeout (seconds) |
| `WG_METRICS_PROMETHEUS` | `true` or `false` | Enable Prometheus metrics |
| `WG_METRICS_JSON`       | `true` or `false` | Enable JSON metrics       |

### Hooks

| Env            | Example                   | Description           |
| -------------- | ------------------------- | --------------------- |
| `WG_PRE_UP`    | `echo "Starting WG"`      | PreUp hook command    |
| `WG_POST_UP`   | `iptables -A FORWARD ...` | PostUp hook command   |
| `WG_PRE_DOWN`  | `echo "Stopping WG"`      | PreDown hook command  |
| `WG_POST_DOWN` | `iptables -D FORWARD ...` | PostDown hook command |

/// warning | Override Behavior

When these override environment variables are set:

- The specified values will be used at runtime instead of database settings
- You can still update these fields through the Web UI and they will be saved to the database
- However, the overridden values from environment variables will always take precedence
- The Web UI will display the overridden (effective) values

These overrides are useful for containerized environments where configuration should be controlled externally.

///

/// note | Note on Port Variables

- `WG_PORT` - The port WireGuard listens on (interface port)
- `WG_CLIENT_PORT` - The port clients connect to (endpoint port, usually same as `WG_PORT`)
- `PORT` - The port the Web UI listens on (HTTP server port)

///
