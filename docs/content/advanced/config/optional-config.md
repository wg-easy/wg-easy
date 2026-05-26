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

## Google OAuth

You can enable Google OAuth login alongside classic username/password authentication. When enabled, a "Sign in with Google" button appears on the login page.

| Env                           | Default | Example                                      | Description                                      |
| ----------------------------- | ------- | -------------------------------------------- | ------------------------------------------------ |
| `OAUTH_GOOGLE_ENABLED`        | `false` | `true`                                       | Enable Google OAuth login                        |
| `OAUTH_GOOGLE_CLIENT_ID`      | -       | `123.apps.googleusercontent.com`             | Google OAuth 2.0 Client ID                       |
| `OAUTH_GOOGLE_CLIENT_SECRET`  | -       | `GOCSPX-xxx`                                 | Google OAuth 2.0 Client Secret                   |
| `OAUTH_GOOGLE_ALLOWED_DOMAIN` | -       | `example.com`                                | Restrict login to a specific email domain        |

/// note | Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://<your-domain>/api/auth/google/callback`
4. Copy the Client ID and Client Secret to the environment variables

If a user logs in with Google and their email matches an existing account, the accounts are automatically linked.

///

/// note | IPv6 Caveats

Disabling IPv6 will disable the creation of the default IPv6 firewall rules and won't add a IPv6 address to the interface and clients.

You will however still see a IPv6 address in the Web UI, but it won't be used.

This option can be removed in the future, as more devices support IPv6.

///
