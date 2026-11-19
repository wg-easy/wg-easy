---
title: Unattended Setup
---

If you want to run the setup without any user interaction, e.g. with a tool like Ansible, you can use these environment variables to configure the setup.

wg-easy uses these values to configure a new installation on its first start.

| Env                                     | Example                                        | Description                                               | Group |
| --------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ----- |
| `INIT_ENABLED`                          | `true`                                         | Enables the below env vars                                | 0     |
| `INIT_USERNAME`                         | `admin`                                        | Sets admin username                                       | 1     |
| `INIT_PASSWORD` or `INIT_PASSWORD_FILE` | `Se!ureP%ssw` or `/run/secrets/admin_password` | Sets the admin password directly or reads it from a file  | 1     |
| `INIT_HOST`                             | `vpn.example.com`                              | Host clients will connect to                              | 1     |
| `INIT_PORT`                             | `51820`                                        | Port clients will connect to and wireguard will listen on | 1     |
| `INIT_DNS`                              | `1.1.1.1,8.8.8.8`                              | Sets global dns setting                                   | 2     |
| `INIT_IPV4_CIDR`                        | `10.8.0.0/24`                                  | Sets IPv4 cidr                                            | 3     |
| `INIT_IPV6_CIDR`                        | `2001:0DB8::/32`                               | Sets IPv6 cidr                                            | 3     |
| `INIT_ALLOWED_IPS`                      | `10.8.0.0/24,2001:0DB8::/32`                   | Sets global Allowed IPs                                   | 4     |

/// warning | Variables have to be used together

Supply every setting in a group. For the group 1 password, set exactly one of `INIT_PASSWORD` and `INIT_PASSWORD_FILE`. If you set `INIT_IPV4_CIDR`, you also have to set `INIT_IPV6_CIDR`.

If you want to skip the setup process, you have to configure group `1`

///

/// note | Security

The initial username and password is not checked for complexity. Make sure to set a long enough username and password. Otherwise, the user won't be able to log in.

Remove the setup variables after setup is complete. If you use `INIT_PASSWORD_FILE`, remove it from the container configuration when you remove the secret mount. wg-easy reads the file on every startup while the variable is set, even after setup is complete. See [Docker and Podman secrets](./optional-config.md#docker-and-podman-secrets) for file handling and a Compose example.

///
