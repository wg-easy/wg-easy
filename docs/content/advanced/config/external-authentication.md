---
title: External Authentication
---

## OAuth

### Providers

To enable OAuth set the env var `OAUTH_PROVIDERS` to any of the following providers:

| Provider          | Value    |
| ----------------- | -------- |
| [Google](#google) | `google` |
| [GitHub](#github) | `github` |

You can enable multiple providers by separating them with a comma:

e.g. `google,github`

### Google

<!-- TODO support allowed domain -->

| Env                           | Required | Example                          | Description                               |
| ----------------------------- | -------- | -------------------------------- | ----------------------------------------- |
| `OAUTH_GOOGLE_CLIENT_ID`      | ✔️       | `123.apps.googleusercontent.com` | Google Client ID                          |
| `OAUTH_GOOGLE_CLIENT_SECRET`  | ✔️       | `GOCSPX-xxx`                     | Google Client Secret                      |
| `OAUTH_GOOGLE_ALLOWED_DOMAIN` | ✖️       | `example.com`                    | Restrict login to a specific email domain |

#### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://<your-domain>/api/auth/google/callback`
4. Copy the Client ID and Client Secret to the environment variables

### GitHub

| Env                          | Required | Example | Description          |
| ---------------------------- | -------- | ------- | -------------------- |
| `OAUTH_GITHUB_CLIENT_ID`     | ✔️       | `xxx`   | GitHub Client ID     |
| `OAUTH_GITHUB_CLIENT_SECRET` | ✔️       | `xxx`   | GitHub Client Secret |

### Generic OIDC

TODO

### Generic OAuth

TODO
