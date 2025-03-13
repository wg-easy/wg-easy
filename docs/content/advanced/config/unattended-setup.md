---
title: Unattended Setup
---

If you want to run the setup without any user interaction, e.g. with a tool like Ansible, you can use these environment variables to configure the setup.

These will only be used during the first start of the container. After that, the setup will be disabled.

| Env              | Example           | Description                                               | Group |
| ---------------- | ----------------- | --------------------------------------------------------- | ----- |
| `INIT_ENABLED`   | `true`            | Enables the below env vars                                | 0     |
| `INIT_USERNAME`  | `admin`           | Sets admin username                                       | 1     |
| `INIT_PASSWORD`  | `Se!ureP%ssw`     | Sets admin password                                       | 1     |
| `INIT_DNS`       | `1.1.1.1,8.8.8.8` | Sets global dns setting                                   | 2     |
| `INIT_IPV4_CIDR` | `10.8.0.0/24`     | Sets ipv4 cidr                                            | 3     |
| `INIT_IPV6_CIDR` | `2001:0DB8::/32`  | sets ipv6 cidr                                            | 3     |
| `INIT_HOST`      | `vpn.example.com` | host clients will connect to                              | 4     |
| `INIT_PORT`      | `51820`           | port clients will connect to and wireguard will listen on | 4     |

/// warning | Variables have to be used together

If variables are in the same group, you have to set them both. For example, if you set `INIT_IPV4_CIDR`, you also have to set `INIT_IPV6_CIDR`.
///

/// note | Password security

The initial password is not checked for complexity. Make sure to set a secure password.

Its recommended to remove the variables after the setup is done to prevent the password from being exposed.
///
