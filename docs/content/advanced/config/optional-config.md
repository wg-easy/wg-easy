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
