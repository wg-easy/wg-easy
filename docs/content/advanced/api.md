---
title: API
---

/// warning | Breaking Changes

This API is not yet stable and may change in the future. The API is currently in development and is subject to change without notice. The API is not yet documented, but we will add documentation as the API stabilizes.

///

You can use the API to interact with the application programmatically. The API is available at `/api` and supports GET, POST, and DELETE requests. The API is designed to be simple and easy to use, with a focus on providing a consistent interface for all endpoints.

There is no documentation for the API yet, but this will be added as the underlying library supports it.

## Authentication

Authenticated endpoints accept the Web UI's session cookie or HTTP Basic Authentication with your login username and password.

Basic Authentication is unavailable for accounts with 2FA enabled and when `DISABLE_PASSWORD_AUTH=true`. A session established through the normal sign-in flow, including 2FA when required, can still access the API. API requests follow the signed-in user's permissions.

Basic Authentication failures are logged as `Security failure: type=basic`. wg-easy does not implement rate limiting. Configure your reverse proxy or an external security tool to protect requests using Basic Authentication on **all API routes**, as limiting only `/api/auth/password` does not cover them. Configure [`TRUSTED_PROXIES`](./config/optional-config.md#trusted-proxies) so that security logs contain the original client IP address.

### Authentication Example

```python
import requests
from requests.auth import HTTPBasicAuth

url = "https://example.com:51821/api/client"
response = requests.get(url, auth=HTTPBasicAuth('username', 'password'))
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"Error: {response.status_code}")
```

## Endpoints

The Endpoints are not yet documented. But as file-based routing is used, you can find the endpoints in the `src/server/api` folder. The method is defined in the file name.

### Endpoints Example

| File Name                            | Endpoint       | Method |
| ------------------------------------ | -------------- | ------ |
| `src/server/api/client/index.get.ts` | `/api/client`  | GET    |
| `src/server/api/setup/2.post.ts`     | `/api/setup/2` | POST   |
