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

These environment variables allow you to override settings that would normally be configured through the Admin Panel. When set, these values take precedence over database settings and cannot be changed through the Web UI.

| Env                         | Example | Description                                          |
| --------------------------- | ------- | ---------------------------------------------------- |
| `OVERRIDE_INTERFACE_PORT`   | `51820` | Override the WireGuard interface listening port      |
| `OVERRIDE_INTERFACE_DEVICE` | `eth1`  | Override the network device/interface                |
| `OVERRIDE_INTERFACE_MTU`    | `1420`  | Override the MTU (Maximum Transmission Unit) setting |

/// warning | Override Behavior

When these override environment variables are set:

- The specified values will be used instead of database settings
- Changes made through the Web UI to these fields will not take effect
- The Web UI will still display the overridden values
- Updates to these fields via the API will be ignored

These overrides are useful for containerized environments where configuration should be controlled externally.

///
