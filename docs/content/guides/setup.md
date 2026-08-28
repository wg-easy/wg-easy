services:
  3xui:
    image: ghcr.io/mhsanaei/3x-ui:latest
    container_name: 3xui_app
    # hostname: yourhostname <- optional
    # The bundled Fail2ban (XUI_ENABLE_FAIL2BAN below) enforces the per-client IP
    # limit with iptables, which needs NET_ADMIN. Without these caps a ban is
    # logged and shown in fail2ban status but never actually applied.
    # NET_RAW covers ip6tables. If you disable Fail2ban you can drop cap_add.
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - $PWD/db/:/etc/x-ui/
      - $PWD/cert/:/root/cert/
    environment:
      XRAY_VMESS_AEAD_FORCED: "false"
      XUI_ENABLE_FAIL2BAN: "true"
      # To use PostgreSQL instead of the default SQLite, run:
      #   docker compose --profile postgres up -d
      # and uncomment the two lines below.
      # XUI_DB_TYPE: "postgres"
      # XUI_DB_DSN: "postgres://xui:xui@postgres:5432/xui?sslmode=disable"
    tty: true
    ports:
      - "2053:2053"
    restart: unless-stopped

  # Optional PostgreSQL backend — only started with: docker compose --profile postgres up -d
  postgres:
    image: postgres:16-alpine
    container_name: 3xui_postgres
    profiles: ["postgres"]
    environment:
      POSTGRES_USER: xui
      POSTGRES_PASSWORD: xui
      POSTGRES_DB: xui
    volumes:
      - $PWD/pgdata/:/var/lib/postgresql/data
    restart: unless-stopped---
title: Setup
---

## User Setup

- **Username**: The username of the user.
- **Password**: The password of the user.
- **Confirm Password**: The password of the user.

## Existing Setup

If you have the config from the previous version, you can import it by clicking "Yes". This currently expects a config from v14.

If this is the first time you are using this, you can click "No" to create a new config.

### No - Host Setup

- **Host**: The host of the server. The clients will connect to this address. This can be a domain name or an IP address. Make sure to wrap it in brackets if it is an IPv6 address. For example: `[::1]` or `[2001:db8::1]`.
- **Port**: The port of the server. The clients will connect to this port. The server will listen on this port.

### Yes - Migration

Select the `wg0.json` file from the previous version. Read [Migrate from v14 to v15](../advanced/migrate/from-14-to-15.md) for more information.
