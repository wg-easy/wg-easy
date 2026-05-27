---
title: External Authentication
---

## OAuth

### Providers

To enable OAuth set the env var `OAUTH_PROVIDERS` to any of the following providers:

| Provider                      | Value    |
| ----------------------------- | -------- |
| [Google](#google)             | `google` |
| [GitHub](#github)             | `github` |
| [Generic OIDC](#generic-oidc) | `oidc`   |

You can enable multiple providers by separating them with a comma:

e.g. `google,github`

### Redirect URIs

You have to configure the following redirect URIs in your OAuth provider:

- `https://<your-domain>/api/auth/<provider>/callback`
  Used to log in to with the provider
- `https://<your-domain>/api/auth/<provider>/link`
  Used to link an existing account to the provider

If your provider does not support multiple redirect URIs (e.g. GitHub) but allows multiple URIs under the same base, then configure:

- `https://<your-domain>/api/auth/<provider>/`

### Google

<!-- TODO support allowed domain -->

| Env                           | Required | Example       | Description                               |
| ----------------------------- | -------- | ------------- | ----------------------------------------- |
| `OAUTH_GOOGLE_CLIENT_ID`      | ✔️       | -             | Google Client ID                          |
| `OAUTH_GOOGLE_CLIENT_SECRET`  | ✔️       | -             | Google Client Secret                      |
| `OAUTH_GOOGLE_ALLOWED_DOMAIN` | ✖️       | `example.com` | Restrict login to a specific email domain |

#### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: See [Redirect URIs](#redirect-uris)
4. Copy the Client ID and Client Secret to the environment variables

### GitHub

| Env                          | Required | Example | Description          |
| ---------------------------- | -------- | ------- | -------------------- |
| `OAUTH_GITHUB_CLIENT_ID`     | ✔️       | `xxx`   | GitHub Client ID     |
| `OAUTH_GITHUB_CLIENT_SECRET` | ✔️       | `xxx`   | GitHub Client Secret |

<!-- TODO Github Setup -->

### Generic OIDC

This supports generic OIDC providers like Authelia, Authentik, etc.

The provider needs to support:

- PKCE
- default scopes: `openid email profile`
- Client Secret Authentication `client_secret_post`

The provider needs to be available with HTTPS and have a valid certificate.

| Env                        | Required | Default | Example                    | Description        |
| -------------------------- | -------- | ------- | -------------------------- | ------------------ |
| `OAUTH_OIDC_SERVER`        | ✔️       | -       | `https://auth.example.com` | OIDC Server        |
| `OAUTH_OIDC_CLIENT_ID`     | ✔️       | -       | -                          | OIDC Client ID     |
| `OAUTH_OIDC_CLIENT_SECRET` | ✔️       | -       | -                          | OIDC Client Secret |
| `OAUTH_OIDC_NAME`          | ✖️       | OIDC    | `Authelia`                 | Provider Name      |

#### Authelia Setup

Generate Client ID and Secret:

```shell
# Client ID
docker run --rm authelia/authelia:latest authelia crypto rand --length 72 --charset rfc3986
# Client Secret
docker run --rm authelia/authelia:latest authelia crypto hash generate pbkdf2 --variant sha512 --random --random.length 72 --random.charset rfc3986
```

```yaml
- client_id: '...'
  client_name: wg-easy
  client_secret: '$pbkdf2-...'
  redirect_uris:
      - https://<your-domain>/api/auth/oidc/callback
      - https://<your-domain>/api/auth/oidc/link
  scopes:
      - openid
      - profile
      - email
  authorization_policy: one_factor
  pre_configured_consent_duration: 1 week
  require_pkce: true
  token_endpoint_auth_method: client_secret_post
```

### Generic OAuth

TODO
