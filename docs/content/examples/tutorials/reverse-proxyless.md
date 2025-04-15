---
title: No Reverse Proxy
---

/// warning | Insecure

This is insecure. You should use a reverse proxy to secure the connection.

Only use this method if you know what you are doing.
///

If you only allow access to the web UI from your local network, you can skip the reverse proxy setup. This is not recommended, but it is possible.

## Setup

- Edit the `docker-compose.yml` file and uncomment `environment` and `INSECURE`

- Set `INSECURE` to `true` to allow access to the web UI over a non-secure connection.

- The `docker-compose.yml` file should look something like this:

    ```yaml
    environment:
        - INSECURE=true
    ```

- Save the file and restart `wg-easy`.

- Make sure that the Web UI is not accessible from outside your local network.
