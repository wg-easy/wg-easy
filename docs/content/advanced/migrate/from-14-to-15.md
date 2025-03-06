---
title: Migrate from v14 to v15
---

This guide will help you migrate from `v14` to version `v15` of `wg-easy`.

## Changes

- This is a complete rewrite of the `wg-easy` project. Therefore the configuration files and the way you interact with the project have changed.
- If you use armv6 or armv7, you can't migrate to `v15` yet. We are working on it.
- If you are connecting to the web ui via HTTP, you need to set the `INSECURE` environment variable to `true` in the new container.

## Migration

### Backup

Before you start the migration, make sure to backup your existing configuration files.

Go into the Web Ui and click the Backup button, this should download a `wg0.json` file.

Or download the `wg0.json` file from your container volume to your pc.

You will need this file for the migration

### Remove old container

1. Stop the running container

If you are using `docker run`

```shell
docker stop wg-easy
```

If you are using `docker-compose`

```shell
docker-compose down
```

### Start new container

Follow the instructions in the [Getting Started][docs-getting-started] or [Basic Installation][docs-examples] guide to start the new container.

In the setup wizard, select that you already already have a configuration file and upload the `wg0.json` file you downloaded in the backup step.

[docs-getting-started]: ../../getting-started.md
[docs-examples]: ../../examples/tutorials/basic-installation.md

### Done

You have now successfully migrated to `v15` of `wg-easy`.
