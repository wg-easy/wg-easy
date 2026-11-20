---
title: Migrate from v14 to v15
---

This guide will help you migrate from `v14` to version `v15` of `wg-easy`.

## Changes

- This is a complete rewrite of the `wg-easy` project, therefore the configuration files and the way you interact with the project have changed.
- If you use armv6 or armv7, you unfortunately won't be able to migrate to `v15`.
- If you are connecting to the Web UI via HTTP, you need to set the `INSECURE` environment variable to `true` in the new container.

## Migration

### Backup

Before you start the migration, make sure to back up your existing configuration files.

Go into the Web UI and click the Backup button, this should download a `wg0.json` file.

Or download the `wg0.json` file from your container volume to your pc.

You will need this file for the migration

You will also need to back up the old environment variables you set for the container, as they will not be automatically migrated.

### Remove old container

1. Stop the running container

If you are using `docker run`

```shell
docker stop wg-easy
```

If you are using `docker compose`

```shell
docker compose down
```

### Start new container

Follow the instructions in the [Getting Started][docs-getting-started] or [Basic Installation][docs-examples] guide to start the new container.

Create the first administrator in the setup wizard, then sign in with that account. When asked if you have an existing setup, select **Yes**, choose your v14 `wg0.json` backup, and select **Upload**.

wg-easy validates the whole backup, including disabled clients, before applying it. If a field is invalid, the error identifies the field and setup stays open. Correct the backup and upload it again. A successful import opens the dashboard.

[docs-getting-started]: ../../getting-started.md
[docs-examples]: ../../examples/tutorials/basic-installation.md

### Environment Variables

v15 does not use the same environment variables as v14, most of them have been moved to the Admin Panel in the Web UI.

### Done

You have now successfully migrated to `v15` of `wg-easy`.
