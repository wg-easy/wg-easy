---
title: Optional Configuration
---

You can set these environment variables to configure the container. They are not required, but can be useful in some cases.

| Env                     | Default   | Example     | Description                             |
| ----------------------- | --------- | ----------- | --------------------------------------- |
| `PORT`                  | `51821`   | `6789`      | TCP port for Web UI.                    |
| `HOST`                  | `0.0.0.0` | `localhost` | IP address web UI binds to.             |
| `INSECURE`              | `false`   | `true`      | If access over http is allowed          |
| `DISABLE_IPV6`          | `false`   | `true`      | If IPv6 support should be disabled      |
| `DISABLE_VERSION_CHECK` | `false`   | `true`      | If wg-easy should check for new updates |

/// note | IPv6 Caveats

Disabling IPv6 will disable the creation of the default IPv6 firewall rules and won't add a IPv6 address to the interface and clients.

You will however still see a IPv6 address in the Web UI, but it won't be used.

This option can be removed in the future, as more devices support IPv6.

///

## Trusted-Header SSO

Trust an upstream reverse proxy that has _already_ authenticated the user (e.g. an [Authentik](https://goauthentik.io/) forward-auth outpost) and asserts the user's identity through request headers. When enabled and the request proves it came from the trusted proxy, wg-easy establishes a session for the matching user, reusing the OAuth account machinery (`oauth_provider` = `trusted-header`) and the [`OAUTH_AUTO_REGISTER`](./external-authentication.md#auto-register) gate to auto-provision when the user does not yet exist.

This is **disabled by default**; stock behaviour is unchanged unless `TRUSTED_PROXY_ENABLED` is set.

| Env                           | Default                | Example             | Description                                                                              |
| ----------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `TRUSTED_PROXY_ENABLED`       | `false`                | `true`              | Enable trusted-header SSO.                                                               |
| `TRUSTED_PROXY_SECRET`        | -                      | `<random-64-hex>`   | Shared secret the proxy must inject. **Required** when enabled (fails closed if absent). |
| `TRUSTED_PROXY_SECRET_HEADER` | `x-wg-proxy-secret`    | `x-wg-proxy-secret` | Header carrying the shared secret.                                                       |
| `TRUSTED_PROXY_HEADER`        | `x-authentik-username` | `x-forwarded-user`  | Header carrying the verified username.                                                   |
| `TRUSTED_PROXY_EMAIL_HEADER`  | `x-authentik-email`    | `x-forwarded-email` | Optional header carrying the verified email (used for account linking).                  |
| `TRUSTED_PROXY_NAME_HEADER`   | `x-authentik-name`     | `x-forwarded-name`  | Optional header carrying the display name.                                               |
| `TRUSTED_PROXY_IPS`           | -                      | `10.42.42.1`        | Optional comma-separated allowlist of proxy source IPs (defense-in-depth).               |
| `TRUSTED_PROXY_DEFAULT_ROLE`  | `client`               | `admin`             | Role for auto-provisioned users: `client` or `admin`.                                    |

/// warning | Security — the secret is the trust boundary

Any client can forge HTTP headers, so wg-easy must be able to tell a request from the trusted proxy apart from any other host that can reach the published port. The **shared secret** (`TRUSTED_PROXY_SECRET`) is that proof: the proxy injects it, wg-easy verifies it with a constant-time compare, and the feature fails closed if it is unset while enabled.

The source-IP allowlist (`TRUSTED_PROXY_IPS`) is only optional defense-in-depth. In a typical Docker deployment it is **not** discriminating: Docker SNATs every inbound connection to the bridge gateway, so the observed peer IP is the same for the proxy and for any other container/host reaching the port. Rely on the secret; add the IP allowlist only when your network topology makes the real peer IP meaningful.

Your proxy **must** strip any client-supplied identity headers (`TRUSTED_PROXY_HEADER`, `_EMAIL_HEADER`, `_NAME_HEADER`) and set its own, so a browser can never pre-set them.

///
