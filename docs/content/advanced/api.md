---
title: API
---

/// warning | Breaking Changes

This API is not yet stable and may change in the future. The API is currently in development and is subject to change without notice. The API is not yet documented, but we will add documentation as the API stabilizes.
///

You can use the API to interact with the application programmatically. The API is available at `/api` and supports both GET and POST requests. The API is designed to be simple and easy to use, with a focus on providing a consistent interface for all endpoints.

There is no documentation for the API yet, but this will be added as the underlying library supports it.

## Authentication

To use the API, you need to authenticate using Basic Authentication. The username and password are the same as the ones you use to log in to the web application.
If you use 2FA, the API will not work. You need to disable 2FA in the web application to use the API.

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

| File Name                        | Endpoint       | Method |
| -------------------------------- | -------------- | ------ |
| `src/server/api/client.get.ts`   | `/api/client`  | GET    |
| `src/server/api/setup/2.post.ts` | `/api/setup/2` | POST   |
