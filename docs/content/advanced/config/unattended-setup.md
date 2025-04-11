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
| `INIT_HOST`      | `vpn.example.com` | Host clients will connect to                              | 1     |
| `INIT_PORT`      | `51820`           | Port clients will connect to and wireguard will listen on | 1     |
| `INIT_DNS`       | `1.1.1.1,8.8.8.8` | Sets global dns setting                                   | 2     |
| `INIT_IPV4_CIDR` | `10.8.0.0/24`     | Sets IPv4 cidr                                            | 3     |
| `INIT_IPV6_CIDR` | `2001:0DB8::/32`  | Sets IPv6 cidr                                            | 3     |

/// warning | Variables have to be used together

If variables are in the same group, you have to set all of them. For example, if you set `INIT_IPV4_CIDR`, you also have to set `INIT_IPV6_CIDR`.

If you want to skip the setup process, you have to configure group `1`
///

/// note | Security

The initial username and password is not checked for complexity. Make sure to set a long enough username and password. Otherwise, the user won't be able to log in.

It's recommended to remove the variables after the setup is done to prevent the password from being exposed.
///
