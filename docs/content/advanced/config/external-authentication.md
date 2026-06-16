---
title: External Authentication
---

## OAuth

### Setup

To enable OAuth set the env var `OAUTH_PROVIDERS` to any of the following providers:

| Provider                      | Value    |
| ----------------------------- | -------- |
| [Google](#google)             | `google` |
| [GitHub](#github)             | `github` |
| [Generic OIDC](#generic-oidc) | `oidc`   |

You can enable multiple providers by separating them with a comma:

e.g. `google,github`

### Auto Register

To automatically register users that log in with an OAuth provider, set the following environment variable to `true`:

| Env                   | Required | Default | Description              |
| --------------------- | -------- | ------- | ------------------------ |
| `OAUTH_AUTO_REGISTER` | :x:      | `false` | Enable auto-registration |

When enabled:

- If a user logs in with an email address that is not yet registered, a new account will be created for them.

- If a user logs in with an email address that is already registered, their account will be linked to the OAuth provider (if not already linked), regardless of the value of `OAUTH_AUTO_REGISTER`.

/// warning | Security

Users will be created with Admin Permissions, as the permissions system is not yet implemented. Only enable this if you trust all users that can log in with the OAuth provider.

Use [Allowed Domains](#allowed-domains) to restrict which users can log in.

///

### Allowed Domains

To only allow users with an email address from a specific domain to log in, set the following environment variable to the allowed domain.

| Env                     | Required | Default | Description           |
| ----------------------- | -------- | ------- | --------------------- |
| `OAUTH_ALLOWED_DOMAINS` | :x:      | -       | Allowed email domains |

You can allow multiple domains by separating them with a comma:

e.g. `example.com,example.org`

### Auto Launch

To automatically launch the OAuth login flow when visiting the login page, set the following environment variable to the provider you want to launch:

| Env                 | Required | Default | Description                   |
| ------------------- | -------- | ------- | ----------------------------- |
| `OAUTH_AUTO_LAUNCH` | :x:      | -       | Auto launch an OAuth provider |

When enabled:

- Visiting the login page will automatically redirect to the selected provider's login page
- The user can still access the normal login page by visiting `/login?auto_launch=false`
- You can auto launch any provider by visiting `/login?auto_launch=<provider>`

### Redirect URIs

You have to configure the following redirect URIs in your OAuth provider:

- `https://<your-domain>/api/auth/<provider>/callback`
  Used to log in to with the provider
- `https://<your-domain>/api/auth/<provider>/link`
  Used to link an existing account to the provider

If your provider does not support multiple redirect URIs (e.g. GitHub) but allows multiple URIs under the same base, then configure:

- `https://<your-domain>/api/auth/<provider>/`

### Provider Configuration

#### Google

| Env                          | Required           | Description          |
| ---------------------------- | ------------------ | -------------------- |
| `OAUTH_GOOGLE_CLIENT_ID`     | :white_check_mark: | Google Client ID     |
| `OAUTH_GOOGLE_CLIENT_SECRET` | :white_check_mark: | Google Client Secret |

<h5>Setup</h5>

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: See [Redirect URIs](#redirect-uris)
4. Copy the Client ID and Client Secret to the environment variables

#### GitHub

| Env                          | Required           | Description          |
| ---------------------------- | ------------------ | -------------------- |
| `OAUTH_GITHUB_CLIENT_ID`     | :white_check_mark: | GitHub Client ID     |
| `OAUTH_GITHUB_CLIENT_SECRET` | :white_check_mark: | GitHub Client Secret |

<h5>Setup</h5>

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Add Authorization callback URL: See [Redirect URIs](#redirect-uris)
4. Create a new client secret
5. Copy the Client ID and Client Secret to the environment variables

#### Generic OIDC

This supports generic OIDC providers like Authelia, Authentik, etc.

The provider needs to support:

- PKCE
- default scopes: `openid email profile`
- Client Secret Authentication `client_secret_post`

The provider needs to be available with HTTPS and have a valid certificate.

| Env                        | Required           | Default | Example                    | Description        |
| -------------------------- | ------------------ | ------- | -------------------------- | ------------------ |
| `OAUTH_OIDC_SERVER`        | :white_check_mark: | -       | `https://auth.example.com` | OIDC Server        |
| `OAUTH_OIDC_CLIENT_ID`     | :white_check_mark: | -       | -                          | OIDC Client ID     |
| `OAUTH_OIDC_CLIENT_SECRET` | :white_check_mark: | -       | -                          | OIDC Client Secret |
| `OAUTH_OIDC_NAME`          | :x:                | OIDC    | `Authelia`                 | Provider Name      |

##### Authelia Setup

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

#### Generic OAuth

Not currently supported

### Disable Password Authentication

To disable password-based authentication and only allow login via OAuth providers, set the following environment variable to `true`:

| Env                     | Required | Default | Description                     |
| ----------------------- | -------- | ------- | ------------------------------- |
| `DISABLE_PASSWORD_AUTH` | :x:      | `false` | Disable password authentication |

When enabled:

- Users will not be able to log in with a password

/// warning | Access Recovery

Before disabling password authentication, ensure that at least one OAuth provider is configured and that you have successfully linked an administrator account.

If no login method is available, you will not be able to log in to the application and will need to reset the configuration to regain access.

///
